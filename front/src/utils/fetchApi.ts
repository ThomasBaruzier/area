import type { ApiFetchOptions } from "../types/fetchOptions";

export class ApiError<T = unknown> extends Error {
  status: number;
  data?: T;
  constructor(message: string, status: number, data?: T) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const isDev = import.meta.env.DEV;
const VITE_BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL || "";

const isAbsoluteUrl = (url: string): boolean =>
  /^https?:\/\//i.test(url) || url.startsWith("//");

function readToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const t = window.localStorage.getItem("token");
    return t || undefined;
  } catch {
    return undefined;
  }
}

function buildQueryString(query?: ApiFetchOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    params.append(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function isJsonLike(body: unknown): boolean {
  return (
    body !== null &&
    body !== undefined &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  );
}

export async function apiFetch<T = unknown>(
  path: string,
  {
    method = "GET",
    query,
    body,
    headers = {},
    signal,
    credentials,
    baseUrl,
    parse = "json",
    timeoutMs,
  }: ApiFetchOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const abortSignals = [controller.signal, signal].filter(
    Boolean,
  ) as AbortSignal[];

  const qs = buildQueryString(query);
  let url: string;
  if (isAbsoluteUrl(path)) {
    url = `${path}${qs}`;
  } else if (isDev) {
    url = `/${path.replace(/^\/+/, "")}${qs}`;
  } else {
    const base = baseUrl || VITE_BACKEND_URL || "";
    url =
      base === ""
        ? `/${path.replace(/^\/+/, "")}${qs}`
        : `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}${qs}`;
  }

  const finalHeaders = new Headers(headers);

  if (!finalHeaders.has("Authorization")) {
    const token = readToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (!finalHeaders.has("Accept")) {
    finalHeaders.set("Accept", "application/json");
  }

  const init: RequestInit = {
    method,
    headers: finalHeaders,
    credentials,
    signal: abortSignals.length === 1 ? abortSignals[0] : controller.signal,
  };

  if (
    method.toUpperCase() !== "GET" &&
    method.toUpperCase() !== "HEAD" &&
    body !== undefined
  ) {
    if (isJsonLike(body)) {
      if (!finalHeaders.has("Content-Type")) {
        finalHeaders.set("Content-Type", "application/json");
      }
      init.body = JSON.stringify(body);
    } else if (body instanceof FormData || body instanceof Blob) {
      finalHeaders.delete("Content-Type");
      init.body = body as BodyInit;
    } else if (body instanceof ArrayBuffer) {
      finalHeaders.set("Content-Type", "application/octet-stream");
      init.body = body as BodyInit;
    } else {
      init.body = body as BodyInit;
    }
  }

  let timeoutId: number | undefined;
  if (timeoutMs && typeof window !== "undefined") {
    timeoutId = window.setTimeout(() => {
      controller.abort();
    }, timeoutMs);
  }

  try {
    const res = await fetch(url, init);

    if (!res.ok) {
      let errData: unknown;
      try {
        errData = await res.clone().json();
      } catch {
        try {
          errData = await res.clone().text();
        } catch (_e: unknown) {
          /* ignore */
        }
      }
      let message = `Request failed with status ${String(res.status)}`;
      if (typeof errData === "object" && errData !== null) {
        if ("message" in errData && typeof errData.message === "string") {
          message = errData.message;
        } else if ("error" in errData && typeof errData.error === "string") {
          message = errData.error;
        }
      } else if (typeof errData === "string" && errData) {
        message = errData;
      }
      throw new ApiError<unknown>(message, res.status, errData);
    }

    if (parse === "none" || res.status === 204) {
      return undefined as unknown as T;
    }
    if (parse === "text") return (await res.text()) as unknown as T;
    if (parse === "blob") return (await res.blob()) as unknown as T;
    if (parse === "arrayBuffer")
      return (await res.arrayBuffer()) as unknown as T;

    return (await res.json()) as T;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default apiFetch;
