import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import apiFetch, { ApiError } from "./fetchApi";

describe("apiFetch", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("should make a successful GET request and parse JSON", async () => {
    const mockData = { message: "success" };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });

    const result = await apiFetch("/api/test");

    expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.any(Object));
    expect(result).toEqual(mockData);
  });

  it("should make a successful POST request with a JSON body", async () => {
    const body = { name: "test" };
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ ...body, id: 1 }),
    });

    await apiFetch("/api/create", { method: "POST", body });
  });

  it("should handle FormData body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
    const formData = new FormData();
    formData.append("key", "value");

    await apiFetch("/api/form", { method: "POST", body: formData });

    expect(mockFetch).toHaveBeenCalled();
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(formData);
    const { headers } = init;
    if (headers instanceof Headers) {
      expect(headers.has("Content-Type")).toBe(false);
    }
  });

  it("should throw an ApiError for non-ok responses", async () => {
    const errorResponse = { error: "Not Found" };
    const mockRes = {
      ok: false,
      status: 404,
      json: (): Promise<object> => Promise.resolve(errorResponse),
      text: (): Promise<string> =>
        Promise.resolve(JSON.stringify(errorResponse)),
    };
    mockFetch.mockResolvedValue({
      ...mockRes,
      clone: () => mockRes,
    });

    await expect(apiFetch("/api/not-found")).rejects.toThrow(ApiError);
    await expect(apiFetch("/api/not-found")).rejects.toThrow("Not Found");

    try {
      await apiFetch("/api/not-found");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      if (e instanceof ApiError) {
        expect(e.status).toBe(404);
        expect(e.data).toEqual(errorResponse);
      }
    }
  });

  it("should include Authorization header if token exists in localStorage", async () => {
    window.localStorage.setItem("token", "test-token");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/api/protected");

    expect(mockFetch).toHaveBeenCalled();
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const { headers } = init;

    if (headers instanceof Headers) {
      expect(headers.get("Authorization")).toBe("Bearer test-token");
    }
  });

  it("should correctly build URL with query parameters", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    const query = { search: "term", limit: 10, active: true, empty: null };
    await apiFetch("/api/search", { query });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/search?search=term&limit=10&active=true",
      expect.any(Object),
    );
  });

  it('should handle "text" parsing', async () => {
    const responseText = "this is plain text";
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(responseText),
    });

    const result = await apiFetch("/api/text", { parse: "text" });
    expect(result).toBe(responseText);
  });

  it("should handle 204 No Content response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
    });

    const result = await apiFetch("/api/delete", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("should abort on timeout", async () => {
    vi.useFakeTimers();
    mockFetch.mockImplementation(
      (
        _url: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Partial<Response>> => {
        return new Promise((resolve, reject) => {
          const handleAbort = (): void => {
            const error = new Error("The user aborted a request.");
            error.name = "AbortError";
            reject(error);
          };

          if (init?.signal?.aborted) {
            handleAbort();
            return;
          }

          const timeout = setTimeout(() => {
            if (init?.signal) {
              init.signal.removeEventListener("abort", handleAbort);
            }
            resolve({ ok: true, json: () => Promise.resolve({}) });
          }, 200);

          if (init?.signal) {
            init.signal.addEventListener("abort", () => {
              clearTimeout(timeout);
              handleAbort();
            });
          }
        });
      },
    );

    const promise = apiFetch("/api/timeout", { timeoutMs: 100 });

    vi.advanceTimersByTime(150);

    await expect(promise).rejects.toThrow("The user aborted a request.");

    vi.useRealTimers();
  });
});
