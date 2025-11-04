import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "./AuthContext";
import ProtectedRoute from "./ProtectedRoutes";

const MockProtectedComponent = (): JSX.Element => <div>Protected Content</div>;
const MockLoginComponent = (): JSX.Element => <div>Login Page</div>;

const renderWithAuth = (
  isAuthenticated: boolean,
  initialRoute: string,
): void => {
  render(
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user: null,
        token: null,
        role: null,
        isAdmin: false,
        login: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/login" element={<MockLoginComponent />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<MockProtectedComponent />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("ProtectedRoute", () => {
  it("should render child for authenticated users", () => {
    renderWithAuth(true, "/protected");
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });

  it("should redirect unauthenticated users", () => {
    renderWithAuth(false, "/protected");
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
