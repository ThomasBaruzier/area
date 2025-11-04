import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, type NavigateFunction } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "./AuthContext";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useNavigate: (): NavigateFunction => mockNavigate,
  };
});

const validToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOiJ0ZXN0dXNlciIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.f-v_4t6sJwEa5-s_pYRk8-g9e_aF8qLgG2xHlJ3dKzE";
const validUser = {
  id: "1234567890",
  username: "testuser",
  email: "test@example.com",
};

const TestConsumer: React.FC = (): JSX.Element => {
  return (
    <AuthContext.Consumer>
      {(value) => (
        <div>
          <span>Is Authenticated: {String(value?.isAuthenticated)}</span>
          <span>User: {value?.user?.username ?? "null"}</span>
          <span>Token: {value?.token ?? "null"}</span>
          <button
            onClick={() => {
              value?.login(validToken);
            }}
          >
            Login
          </button>
          <button
            onClick={() => {
              value?.login("invalid.token.string");
            }}
          >
            Login Invalid
          </button>
          <button
            onClick={() => {
              value?.logout();
            }}
          >
            Logout
          </button>
        </div>
      )}
    </AuthContext.Consumer>
  );
};

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should initialize as unauthenticated", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("Is Authenticated: false")).toBeInTheDocument();
    expect(screen.getByText("User: null")).toBeInTheDocument();
    expect(screen.getByText("Token: null")).toBeInTheDocument();
  });

  it("should initialize from localStorage", () => {
    localStorage.setItem("token", validToken);
    localStorage.setItem("user", JSON.stringify(validUser));
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("Is Authenticated: true")).toBeInTheDocument();
    expect(screen.getByText(`User: ${validUser.username}`)).toBeInTheDocument();
    expect(screen.getByText(`Token: ${validToken}`)).toBeInTheDocument();
  });

  it("should handle valid login", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByText("Login"));

    expect(screen.getByText("Is Authenticated: true")).toBeInTheDocument();
    expect(screen.getByText(`User: ${validUser.username}`)).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe(validToken);
    expect(localStorage.getItem("user")).toBe(JSON.stringify(validUser));
  });

  it("should handle invalid login", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", validToken);
    localStorage.setItem("user", JSON.stringify(validUser));

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Is Authenticated: true")).toBeInTheDocument();

    await user.click(screen.getByText("Login Invalid"));

    expect(screen.getByText("Is Authenticated: false")).toBeInTheDocument();
    expect(screen.getByText("User: null")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe(null);
    expect(localStorage.getItem("user")).toBe(null);
  });

  it("should handle logout", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", validToken);
    localStorage.setItem("user", JSON.stringify(validUser));

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Is Authenticated: true")).toBeInTheDocument();

    await user.click(screen.getByText("Logout"));

    expect(screen.getByText("Is Authenticated: false")).toBeInTheDocument();
    expect(screen.getByText("User: null")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe(null);
    expect(localStorage.getItem("user")).toBe(null);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should clear malformed localStorage data", () => {
    localStorage.setItem("token", validToken);
    localStorage.setItem("user", '{"id":123}');

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Is Authenticated: false")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe(null);
    expect(localStorage.getItem("user")).toBe(null);
  });

  it("should clear localStorage if user object and token ID do not match", () => {
    const mismatchedUser = { ...validUser, id: "mismatch" };
    localStorage.setItem("token", validToken);
    localStorage.setItem("user", JSON.stringify(mismatchedUser));
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("Is Authenticated: false")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it("should throw error when useAuth is used outside AuthProvider", () => {
    const TestComponent = (): JSX.Element => {
      useAuth();
      return <div>Should not render</div>;
    };

    expect(() => {
      render(
        <MemoryRouter>
          <TestComponent />
        </MemoryRouter>,
      );
    }).toThrow("useAuth must be used within an AuthProvider");
  });
});
