import { render, screen, waitFor } from "@testing-library/react";
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
import UserRegisterPage from "./UserRegister";

const mockedApiFetch = vi.mocked(apiFetch);
const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useNavigate: (): NavigateFunction => mockNavigate,
  };
});

const renderComponent = (): void => {
  render(
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
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<UserRegisterPage />} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("UserRegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render registration form", () => {
    renderComponent();
    expect(
      screen.getByRole("heading", { name: /register/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /register/i }),
    ).toBeInTheDocument();
  });

  it("should validate password length", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText(/username/i), "testuser");
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "12345");
    await user.click(screen.getByRole("button", { name: /register/i }));

    expect(
      await screen.findByText("Password must be at least 6 characters long."),
    ).toBeInTheDocument();
    expect(mockedApiFetch).not.toHaveBeenCalled();
  });

  it("should show API error on failure", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockRejectedValue(new Error("Email already in use"));
    renderComponent();

    await user.type(screen.getByLabelText(/username/i), "testuser");
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /register/i }));

    expect(await screen.findByText("Email already in use")).toBeInTheDocument();
  });

  it("should register, login, and navigate to home", async () => {
    const user = userEvent.setup();
    mockedApiFetch
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ access_token: "test-token" });
    renderComponent();

    await user.type(screen.getByLabelText(/username/i), "testuser");
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/api/user/register", {
        method: "POST",
        body: {
          username: "testuser",
          email: "test@example.com",
          password: "password123",
        },
      });
    });

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/api/user/login", {
        method: "POST",
        body: { email: "test@example.com", password: "password123" },
      });
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test-token");
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("should disable button on submit", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockImplementation(() => new Promise(() => {}));
    renderComponent();

    await user.type(screen.getByLabelText(/username/i), "testuser");
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");

    const button = screen.getByRole("button", { name: /register/i });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Registering...");
  });
});
