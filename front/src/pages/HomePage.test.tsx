import type { RenderResult } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "../auth/AuthContext";
import HomePage from "./HomePage";

const renderWithProvider = (isAuthenticated: boolean): RenderResult => {
  return render(
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user: null,
        token: null,
        role: null,
        isAdmin: false,
        logout: vi.fn(),
        login: vi.fn(),
      }}
    >
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("HomePage", () => {
  it("should show auth buttons when logged out", () => {
    renderWithProvider(false);

    expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /view my workflows/i }),
    ).not.toBeInTheDocument();
  });

  it("should show workflow link when logged in", () => {
    renderWithProvider(true);

    expect(
      screen.getByRole("link", { name: /view my workflows/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /login/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /register/i }),
    ).not.toBeInTheDocument();
  });

  it("should render title and subtitle", () => {
    renderWithProvider(false);

    expect(
      screen.getByRole("heading", { name: /welcome to area/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/let's automate your favorite apps and services/i),
    ).toBeInTheDocument();
  });
});
