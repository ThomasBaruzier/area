# Authentication - technical details

This document describes how authentication operates on the frontend.

## Main files

- `src/auth/AuthContext.ts`: Defines the context type and exports it.
- `src/auth/AuthProvider.tsx`: The Provider component that contains the login, logout, and token logic.
- `src/auth/useAuth.ts`: The hook used to consume the context.
- `src/auth/ProtectedRoutes.tsx`: A wrapper for routes that require authentication.
- `src/auth/AdminRoute.tsx`: A wrapper for routes that require admin privileges.

---

## Context shape

The `AuthContextType` exposes:
- `user: User | null`
- `token: string | null`
- `isAuthenticated: boolean`
- `role: string | null`
- `isAdmin: boolean`
- `login(accessToken: string): void`
- `logout(): void`

---

## JWT decoding

In `AuthProvider.tsx`:
- `decodeJwt(token: string): User | null`
    - It decodes the payload (`atob(token.split(".")[1])`).
    - It requires `sub`, `username`, and `email` in the payload.
    - It returns: `{ id, username, email }`.
- `decodeRoleFromToken(token: string | null): string | null`
    - It extracts the `role` claim from the payload, returning a string or null.

---

## Lifecycle: initialization, login, logout

### Initialization
- On mount, `AuthProvider` reads the `token` and `user` from `localStorage`.
- If both are present, it parses the user object and decodes the token.
- If the user ID from the object matches the one in the token, it restores the state; otherwise, it clears `localStorage`.

### Login
- `login(accessToken)`:
    - Decodes the JWT to get the `User` object.
    - Updates the state and `localStorage` with the new `user` and `token`.
    - If the token is invalid, it triggers `logout()`.

### Logout
- It clears the state, removes `user` and `token` from `localStorage`.
- It redirects the user to `/login`.

---

## Role and admin status

- `role`: Extracted from the `role` claim in the JWT payload.
- `isAdmin`: A boolean derived from `role?.toUpperCase() === "ADMIN"`.

---

## Route wrappers

- `ProtectedRoutes.tsx`: Redirects to `/login` if the user is not logged in.
- `AdminRoute.tsx`: Redirects to `/login` if the user is not logged in, or to `/` if they are not an admin.

---

## Access hook

- `useAuth()`: Consumes the context. Use this hook in any component that needs authentication information or access to `login`/`logout` functions.

---

## User type

Expected shape of `User` (in `src/types/user.ts`):
```typescript
type User = {
    id: string;
    username: string;
    email: string;
    name?: string;
    initial?: string;
}
```
