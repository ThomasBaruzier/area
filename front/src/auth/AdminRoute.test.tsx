import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import AdminRoute from "./AdminRoute";
import { AuthContext, type AuthContextType } from "./AuthContext";

const MockAdminComponent = (): JSX.Element => <div>Admin Content</div>;
const MockLoginComponent = (): JSX.Element => <div>Login Page</div>;
const MockHomeComponent = (): JSX.Element => <div>Home Page</div>;

const renderWithAuth = (
  authContextValue: Partial<AuthContextType>,
  initialRoute: string,
): void => {
  const fullContextValue: AuthContextType = {
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    token: null,
    role: null,
    login: vi.fn(),
    logout: vi.fn(),
    ...authContextValue,
  };

  render(
    <AuthContext.Provider value={fullContextValue}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/login" element={<MockLoginComponent />} />
          <Route path="/" element={<MockHomeComponent />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<MockAdminComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("AdminRoute", () => {
  it("should render child for authenticated admin users", () => {
    renderWithAuth({ isAuthenticated: true, isAdmin: true }, "/admin");
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("should redirect authenticated non-admin users to home", () => {
    renderWithAuth({ isAuthenticated: true, isAdmin: false }, "/admin");
    expect(screen.getByText("Home Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("should redirect unauthenticated users to login", () => {
    renderWithAuth({ isAuthenticated: false, isAdmin: false }, "/admin");
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });
});
