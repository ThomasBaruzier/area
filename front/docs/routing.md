# Routing and protected routes (React Router v6)

## Organization

- Routes are defined in `App.tsx` using `react-router-dom`.
- We use layout routes to protect entire branches of the application via:
    - `<ProtectedRoute />` for routes requiring login.
    - `<AdminRoute />` for admin-only routes.

## Structure excerpt (simplified)

```tsx
<Routes>
  {/* Public Routes */}
  <Route path="/" element={<HomePage />} />
  <Route path="/login" element={<UserLoginPage />} />
  <Route path="/register" element={<UserRegisterPage />} />

  {/* Protected Routes */}
  <Route element={<ProtectedRoute />}>
    <Route path="/services" element={<ServiceListPage />} />
    <Route path="/workflow/list" element={<WorkflowListPage />} />
    <Route path="/workflow/create" element={<CreateWorkflow />} />
    <Route path="/workflow/edit/:id" element={<CreateWorkflow />} />
  </Route>

  {/* Admin-Only Routes */}
  <Route element={<AdminRoute />}>
    <Route path="/admin/users" element={<AdminUsers />} />
  </Route>
</Routes>
```

- Public pages (login, register) are outside the protected wrappers.
- `/services` and `/workflow/*` pages require authentication.
- `/admin/users` requires the admin role.

## Wrappers

- `ProtectedRoutes.tsx`: Redirects to `/login` if the user is not logged in.
- `AdminRoute.tsx`: Redirects to `/login` if not logged in, otherwise redirects to `/` if the user is not an admin.

## Context providers

- `AuthProvider` must wrap the entire application (this is done in `App.tsx`).
- Other providers (for workflows, metadata, etc.) are nested underneath it.

---
