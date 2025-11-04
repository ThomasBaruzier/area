import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextType } from "../auth/AuthContext";
import apiFetch from "../utils/fetchApi";
import AdminUsers from "./AdminUsers";

vi.mock("../utils/fetchApi");
const mockedApiFetch = vi.mocked(apiFetch);

const mockUsers = [
  { id: 1, username: "admin", email: "admin@test.com", role: "ADMIN" },
  { id: 2, username: "user", email: "user@test.com", role: "USER" },
];

const renderComponent = (authContext: Partial<AuthContextType> = {}): void => {
  const fullContext: AuthContextType = {
    isAuthenticated: true,
    isAdmin: true,
    user: { id: "1", username: "admin", email: "admin@test.com" },
    token: "admin-token",
    role: "ADMIN",
    login: vi.fn(),
    logout: vi.fn(),
    ...authContext,
  };

  render(
    <AuthContext.Provider value={fullContext}>
      <MemoryRouter>
        <AdminUsers />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("AdminUsers", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    window.alert = vi.fn();
  });

  it("should show unauthorized message for non-admins", () => {
    renderComponent({ isAdmin: false });
    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
  });

  it("should fetch and display users for admins", async () => {
    mockedApiFetch.mockResolvedValue(mockUsers);
    renderComponent();
    await screen.findByText("admin@test.com");
    expect(screen.getByText("user@test.com")).toBeInTheDocument();
    expect(mockedApiFetch).toHaveBeenCalledWith("/api/user/list");
  });

  it("should allow editing a user", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockResolvedValue(mockUsers);
    renderComponent();
    await screen.findByText("user@test.com");

    const userRow = screen.getByTestId("user-row-2");
    const editButton = within(userRow).getByRole("button", { name: "Edit" });
    await user.click(editButton);

    const usernameInput = within(userRow).getByDisplayValue("user");
    await user.clear(usernameInput);
    await user.type(usernameInput, "updatedUser");

    mockedApiFetch.mockResolvedValueOnce({
      id: 2,
      username: "updatedUser",
      email: "user@test.com",
      role: "USER",
    });
    await user.click(within(userRow).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith(
        "/api/user/admin/2",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    expect(await screen.findByText("updatedUser")).toBeInTheDocument();
  });

  it("should allow deleting a user", async () => {
    window.confirm = vi.fn(() => true);
    const user = userEvent.setup();
    mockedApiFetch.mockResolvedValue(mockUsers);
    renderComponent();
    await screen.findByText("user@test.com");

    const userRow = screen.getByTestId("user-row-2");
    const deleteButton = within(userRow).getByRole("button", {
      name: "Delete",
    });

    mockedApiFetch.mockResolvedValueOnce({ message: "User deleted" });
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/api/user/admin/2", {
        method: "DELETE",
      });
    });
    expect(screen.queryByText("user@test.com")).not.toBeInTheDocument();
  });

  it("should allow promoting a user", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockResolvedValue(mockUsers);
    renderComponent();
    await screen.findByText("user@test.com");

    const userRow = screen.getByTestId("user-row-2");
    const promoteButton = within(userRow).getByRole("button", {
      name: "Promote",
    });
    mockedApiFetch.mockResolvedValueOnce({
      id: 2,
      username: "user",
      email: "user@test.com",
      role: "ADMIN",
    });
    await user.click(promoteButton);

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/api/user/admin/2/promote", {
        method: "PATCH",
      });
    });
    const updatedUserRow = screen.getByTestId("user-row-2");
    expect(within(updatedUserRow).getByText("ADMIN")).toBeInTheDocument();
  });

  it("should show error message when user fetch fails", async () => {
    mockedApiFetch.mockRejectedValue(new Error("Network error"));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Failed to load users")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("should show error on edit failure", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockResolvedValue(mockUsers);
    renderComponent();
    await screen.findByText("user@test.com");

    const userRow = screen.getByTestId("user-row-2");
    const editButton = within(userRow).getByRole("button", { name: "Edit" });
    await user.click(editButton);

    const usernameInput = within(userRow).getByDisplayValue("user");
    await user.clear(usernameInput);
    await user.type(usernameInput, "updatedUser");

    mockedApiFetch.mockRejectedValueOnce(new Error("Update failed"));
    await user.click(within(userRow).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to save changes");
    });
  });

  it("should show error on delete failure", async () => {
    window.confirm = vi.fn(() => true);
    const user = userEvent.setup();
    mockedApiFetch.mockResolvedValue(mockUsers);
    renderComponent();
    await screen.findByText("user@test.com");

    const userRow = screen.getByTestId("user-row-2");
    const deleteButton = within(userRow).getByRole("button", {
      name: "Delete",
    });
    mockedApiFetch.mockRejectedValueOnce(new Error("Delete failed"));
    await user.click(deleteButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to delete user");
    });
  });

  it("should show error on promote failure", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockResolvedValue(mockUsers);
    renderComponent();
    await screen.findByText("user@test.com");

    const userRow = screen.getByTestId("user-row-2");
    const promoteButton = within(userRow).getByRole("button", {
      name: "Promote",
    });
    mockedApiFetch.mockRejectedValueOnce(new Error("Promote failed"));
    await user.click(promoteButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to promote user");
    });
  });

  it("should disable promote button for admins", async () => {
    mockedApiFetch.mockResolvedValue([
      { id: 1, username: "admin", email: "admin@test.com", role: "ADMIN" },
    ]);
    renderComponent({});
    await screen.findByText("admin@test.com");

    const adminRow = screen.getByTestId("user-row-1");
    const promoteButton = within(adminRow).getByRole("button", {
      name: "Promote",
    });
    expect(promoteButton).toBeDisabled();
  });
});
