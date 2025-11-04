import { render, screen, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  type NavigateFunction,
  Route,
  Routes,
} from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { useAuth } from "../auth/useAuth";
import AuthCallback from "./AuthCallback";

vi.mock("../auth/useAuth");

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useNavigate: (): NavigateFunction => mockNavigate,
  };
});

const mockedUseAuth = vi.mocked(useAuth);

const renderComponent = (
  search: string,
  isAuthenticated = false,
): { rerender: (ui: React.ReactElement) => void } => {
  mockedUseAuth.mockReturnValue({
    login: mockLogin,
    isAuthenticated,
    logout: vi.fn(),
    token: null,
    user: null,
    role: null,
    isAdmin: false,
  });

  return render(
    <MemoryRouter initialEntries={[`/oauth-callback${search}`]}>
      <Routes>
        <Route path="/oauth-callback" element={<AuthCallback />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("AuthCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show authenticating message", () => {
    renderComponent("?token=test-token");
    expect(screen.getByText("Authenticating...")).toBeInTheDocument();
  });

  it("should login and navigate on success", async () => {
    const token = "my-secret-token";
    const { rerender } = renderComponent(`?token=${token}`, false);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(token);
    });

    mockedUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: true,
      logout: vi.fn(),
      token: token,
      user: { id: "1", username: "test", email: "test@test.com" },
      role: null,
      isAdmin: false,
    });

    rerender(
      <MemoryRouter initialEntries={[`/oauth-callback?token=${token}`]}>
        <Routes>
          <Route path="/oauth-callback" element={<AuthCallback />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/services", { replace: true });
    });
  });

  it("should redirect with error if no token", async () => {
    renderComponent("");

    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/login", {
        replace: true,
        state: { error: "Authentication failed. Please try again." },
      });
    });
  });
});
