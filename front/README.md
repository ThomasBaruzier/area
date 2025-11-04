# Developer documentation - frontend area

This file is a guide for onboarding developers to the frontend portion of the project.

---

## 1. Local environment

### Prerequisites
- Node.js 18+ (or the supported project version)
- Yarn (preferred) or npm
- IDE: VSCode with recommended extensions (TypeScript, ESLint, Prettier)
- Access to a running backend instance (or a mock server)

### Installation
- `git clone <repo>`
- `cd front`
- `yarn install` (or `npm install`)

---

## 2. Useful scripts (package.json)

Check `package.json` for the exact list. Examples include:
- `dev`: Starts the development server (Vite, React Scripts, etc.).
- `build`: Creates a production build.
- `start`: Serves the production build (if configured).
- `lint`: Runs code analysis.
- `test`: Runs tests.

---

## 3. Architecture and conventions

- Strict TypeScript is enforced.
- Folder structure:
    - `auth/`: Everything related to authentication.
    - `connections/`: Context and hooks for external service connections.
    - `components/`: Reusable UI components.
    - `utils/`: Helper functions (e.g., `fetchApi`).
    - `types/`: Global type definitions.
- We use functional components with React hooks.
- Custom hooks are exposed via the `useXxx` naming convention.
- Global state is managed with Context (e.g., for auth, connections).

### Naming
- Component files use PascalCase (e.g., `Header.tsx`).
- Utility files use camelCase.
- Type names are prefixed with `type` or `T` where appropriate (e.g., `User` in `types/user.ts`).

---

## 4. State management and data flow

The frontend uses a hierarchy of React Context Providers for global state management. This approach ensures that components have access to the data they need without prop-drilling.

```mermaid
graph TD
    subgraph "index.tsx"
        A[BrowserRouter]
    end

    subgraph "App.tsx (Context Providers)"
        A --> AP[AuthProvider];
        AP --> CP[ConnectionsProvider];
        CP --> WP[WorkflowsProvider];
    end

    subgraph "Pages & Components"
        WP --> P[Any Page or Component];
    end

    subgraph "Accessing State via Hooks"
        P -.-> hAuth[useAuth()];
        P -.-> hConn[useConnections()];
        P -.-> hFlow[useWorkflows()];
    end

    subgraph "Data Fetching"
        hConn -- Calls --> F[apiFetch Utility];
        hFlow -- Calls --> F;
        F -- "Adds Auth Token from useAuth()" --> API[Backend API];
    end

    style P fill:#cde,stroke:#333
    style F fill:#f9f,stroke:#333
```

- **Providers**: The main `App.tsx` wraps the application in a series of providers. `AuthProvider` is at the top, making authentication state available to all others.
- **Hooks**: Components access this global state using custom hooks like `useAuth()`, `useConnections()`, etc.
- **Data Fetching**: The hooks use a centralized `apiFetch` utility to communicate with the backend. This utility automatically retrieves the JWT from the `AuthContext` to make authenticated requests.

---

## 5. Authentication - technical overview

### Main files
- `AuthContext.ts`
- `AuthProvider.tsx`
- `useAuth.ts`
- `AdminRoute.tsx`
- `ProtectedRoutes.tsx`

### Behavior
- The `AuthProvider` initializes its state from `localStorage` (`token` and `user`) and decodes the JWT to build the user object.
- `login(accessToken)`:
    - Decodes the JWT payload.
    - Updates the state (`user`, `token`).
    - Persists the state to `localStorage`.
- `logout()`:
    - Removes the token and user from the state and `localStorage`.
    - Redirects to `/login`.
- Role extraction:
    - The `decodeRoleFromToken` function reads the `role` claim from the JWT payload.
    - The `isAdmin` flag is computed with `role.toUpperCase() === 'ADMIN'`.
- Protected routes:
    - `ProtectedRoute` redirects to `/login` if the user is not authenticated.
    - `AdminRoute` redirects to `/login` if not authenticated, or to `/` if not an admin.

For full technical details: [Authentication - Technical Details](./docs/authentication.md)

---

## 6. External services connections

### Files
- `ConnectionsContext.ts`
- `ConnectionsProvider.tsx`
- `useConnections.ts`

### Behavior
- `ConnectionsProvider` calls `/api/user/connections` to get the list of connected services.
- It exposes `connections`, `isConnected(serviceName)`, and `fetchConnections()`.

### Notes
- `isConnected` normalizes the service name to lowercase when checking.
- `fetchConnections` guards against concurrent calls via an `isLoadingRef` flag.
- The API call is triggered automatically when the user is authenticated.

For more details: [Connections Context](./docs/api-fetching.md)

---

## 7. Routing (React Router v6)

- Use `Outlet` for nested routes.
- `ProtectedRoute` and `AdminRoute` use `Navigate` for redirections.
- Example usage (`routes.tsx`):
    - `<Route element={<ProtectedRoute />}>`
      `<Route path="/profile" element={<Profile />} />`
      `</Route>`

### Best practices
- Always keep security logic on the server side (token and permission checks).
- Do not rely solely on frontend redirects for security.

See examples: [Routing & Protected Routes](./docs/routing.md)

---

## 8. Main components

- `Header.tsx`:
    - Uses `useLocation` and `useAuth`.
    - Builds the navigation (`PillNav`) based on authentication status and user role.
- `PillNav/`: The main navigation component (logo, items, styling).
- `UserAvatar.tsx`, `ThemeButton.tsx`: Visual tools in the header.

Details and recommendations: [Main Components](./docs/components.md)

---

## 9. End-to-end testing

For guidelines on writing effective and stable end-to-end tests with Cypress, please refer to the dedicated guide.

- [Cypress e2e testing guide](./docs/cypress-guide.md)
