import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "../auth/AuthContext";
import UserAvatar from "./UserAvatar";

const mockLogout = vi.fn();

const renderWithProvider = (
  isAuthenticated: boolean,
  user: { id: string; username: string; email: string } | null,
  token: string | null,
) => {
  return render(
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user: user ? { ...user } : null,
        token,
        role: null,
        isAdmin: false,
        logout: mockLogout,
        login: vi.fn(),
      }}
    >
      <MemoryRouter>
        <UserAvatar />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("UserAvatar", () => {
  beforeEach(() => {
    mockLogout.mockClear();
  });

  it("should render initial from user object", () => {
    renderWithProvider(
      true,
      { id: "1", username: "testuser", email: "test@example.com" },
      "token",
    );
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("should render initial from token", () => {
    const sampleToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imp3dHVzZXIiLCJzdWIiOiIxMjMiLCJlbWFpbCI6Imp3dEB0ZXN0LmNvbSJ9.abcde";
    renderWithProvider(true, null, sampleToken);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("should show fallback initial", () => {
    renderWithProvider(true, null, "invalid-token");
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("should toggle menu on click", async () => {
    const user = userEvent.setup();
    renderWithProvider(
      true,
      { id: "1", username: "testuser", email: "test@example.com" },
      "token",
    );

    const avatarButton = screen.getByRole("button", { name: /testuser/i });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(avatarButton);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();

    await user.click(avatarButton);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should call logout on click", async () => {
    const user = userEvent.setup();
    renderWithProvider(
      true,
      { id: "1", username: "testuser", email: "test@example.com" },
      "token",
    );

    await user.click(screen.getByRole("button", { name: /testuser/i }));

    const logoutButton = screen.getByRole("button", { name: /logout/i });
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("should close menu on outside click", async () => {
    const user = userEvent.setup();
    renderWithProvider(
      true,
      { id: "1", username: "testuser", email: "test@example.com" },
      "token",
    );

    await user.click(screen.getByRole("button", { name: /testuser/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
