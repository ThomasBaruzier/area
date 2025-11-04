# API fetching and external service connections

This document explains how API calls are managed on the frontend, centralized via `apiFetch`, and how token handling for the backend works.

---

## 1. Centralizing API calls

All HTTP calls on the frontend are routed through the following file:

- `src/utils/fetchApi.ts`

### Main function: `apiFetch`

- Signature:
  ```typescript
  export async function apiFetch<T = unknown>(
    path: string,
    options?: ApiFetchOptions
  ): Promise<T>
  ```
- It handles:
    - Building the full URL (base URL plus query parameters).
    - Automatically adding the `Authorization: Bearer <token>` header if a token is present in `localStorage`.
    - HTTP methods (`GET`, `POST`, etc.).
    - JSON or form-data bodies and dynamic headers.
    - Centralized error handling (it throws a custom `ApiError`).
    - Parsing the response based on its content type (`json`, `text`, `blob`, etc.).
    - Timeouts.

- The JWT is automatically read from `localStorage` and added to the `Authorization` header unless explicitly overridden.

---

## 2. Using `apiFetch`

GET call example:
```typescript
const data = await apiFetch("/api/user/profile");
```

POST call example:
```typescript
const result = await apiFetch("/api/workflows", {
  method: "POST",
  body: { name: "My workflow" }
});
```

Error handling:
```typescript
try {
  await apiFetch("/api/sensitive-data");
} catch (e) {
  if (e instanceof ApiError) {
    // Handle API-specific error
  }
}
```

Query parameters:
```typescript
await apiFetch("/api/services", {
  query: { page: 2, perPage: 20 }
});
```

---

## 3. Token handling and security

- The JWT is stored on the client side in `localStorage` under the key `token`.
- When making a call, if the token exists, it is injected into the header:
  ```
  Authorization: Bearer <token>
  ```
- If an API call returns a 401 (Unauthorized) error, the caller should trigger a logout or token refresh, according to the backend's policy.

---

## 4. Connecting with external services

### Fetching available services

- The list of available services (e.g., Google, GitHub, etc.) is provided by a backend endpoint.
- Example:
  ```typescript
  const services = await apiFetch("/api/services");
  ```

### Connecting a service

- To connect a service, the UI typically opens a popup or redirects the user to the external service's authentication page.
- Once the OAuth flow is complete, a backend endpoint validates the connection, and the frontend updates its state (e.g., by refreshing the list of connected services).

### Checking connection state

- To check if a service is connected, you can read the list provided by `/api/user/connections`.
- Example:
  ```typescript
  const connectedServices = await apiFetch("/api/user/connections");
  const isGithubConnected = connectedServices.includes("github");
  ```

---

## 5. Best practices

- Always use `apiFetch` for backend communication to benefit from centralized error handling, token injection, and consistent behavior.
- Never use direct `fetch()` calls in the application code.
- Type the responses via TypeScript for each endpoint to ensure type safety.

---

## 6. Useful references

- `../../src/utils/fetchApi.ts`
- `../../src/types/fetchOptions.ts` - Typed options for API calls.

---
