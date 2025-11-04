import type { RenderResult } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  type NavigateFunction,
  Route,
  Routes,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/fetchApi");

import { AuthContext } from "../auth/AuthContext";
import apiFetch from "../utils/fetchApi";
import UserLoginPage from "./UserLogin";

const mockLogin = vi.fn();
const mockNavigate = vi.fn();
const mockedApiFetch = vi.mocked(apiFetch);

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useNavigate: (): NavigateFunction => mockNavigate,
  };
});

const renderComponent = (): RenderResult => {
  return render(
    <AuthContext.Provider
      value={{
        isAuthenticated: false,
        user: null,
        token: null,
        role: null,
        isAdmin: false,
        logout: vi.fn(),
        login: mockLogin,
      }}
    >
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<UserLoginPage />} />
          <Route path="/workflow/list" element={<div>Workflows Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("UserLoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render login form", () => {
    renderComponent();
    expect(screen.getByRole("heading", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account\?/i)).toBeInTheDocument();
  });

  it("should allow typing in fields", async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  it("should show error on failed login", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockRejectedValue(new Error("Invalid credentials"));
    renderComponent();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /login/i }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should login and navigate on success", async () => {
    const user = userEvent.setup();
    const accessToken = "fake-access-token";
    mockedApiFetch.mockResolvedValue({ access_token: accessToken });
    renderComponent();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /login/i }));

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/user/login", {
      method: "POST",
      body: { email: "test@example.com", password: "password123" },
    });

    expect(mockLogin).toHaveBeenCalledWith(accessToken);
    expect(mockNavigate).toHaveBeenCalledWith("/workflow/list");
  });

  it("should disable button on submit", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockImplementation(() => new Promise(() => {}));
    renderComponent();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");

    const loginButton = screen.getByRole("button", { name: /login/i });
    await user.click(loginButton);

    expect(loginButton).toBeDisabled();
    expect(loginButton).toHaveTextContent("Logging in...");
  });
});
