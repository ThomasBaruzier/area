export type ApiFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  authToken?: string;
  credentials?: RequestCredentials;
  baseUrl?: string;
  parse?: "json" | "text" | "blob" | "arrayBuffer" | "none";
  timeoutMs?: number;
};
