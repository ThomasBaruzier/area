import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextType } from "../auth/AuthContext";
import Header from "./Header";

vi.mock("./ThemeButton", () => ({ default: () => <div>ThemeButton</div> }));
vi.mock("./UserAvatar", () => ({ default: () => <div>UserAvatar</div> }));

const renderWithProvider = (
  authContextValue: Partial<AuthContextType>,
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
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("Header", () => {
  it("should show Login link when not authenticated", () => {
    renderWithProvider({ isAuthenticated: false });
    expect(screen.getByRole("menuitem", { name: "Login" })).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Users" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("UserAvatar")).not.toBeInTheDocument();
  });

  it("should show standard links when authenticated as a regular user", () => {
    renderWithProvider({ isAuthenticated: true, isAdmin: false });
    expect(
      screen.queryByRole("menuitem", { name: "Login" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Workflows" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Users" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("UserAvatar")).toBeInTheDocument();
  });

  it("should show Users link when authenticated as an admin", () => {
    renderWithProvider({ isAuthenticated: true, isAdmin: true });
    expect(screen.getByRole("menuitem", { name: "Users" })).toBeInTheDocument();
  });
});
