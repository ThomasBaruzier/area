import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { useContext } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "../auth/AuthContext";
import type { Workflow } from "../types/workflow";
import apiFetch, { ApiError } from "../utils/fetchApi";
import {
  WorkflowsContext,
  type WorkflowsContextType,
} from "./WorkflowsContext";
import { WorkflowsProvider } from "./WorkflowsProvider";

vi.mock("../utils/fetchApi", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    default: vi.fn(),
  };
});

const mockedApiFetch = vi.mocked(apiFetch);

const mockWorkflows: Workflow[] = [
  {
    id: 1,
    toggle: true,
    action: { serviceId: 1, actionId: 1, actionBody: {} },
    reactions: [],
  },
  {
    id: 2,
    toggle: true,
    action: { serviceId: 2, actionId: 2, actionBody: {} },
    reactions: [],
  },
];

const TestConsumer = (): ReactElement | null => {
  const context = useContext(WorkflowsContext);
  if (!context) return null;
  return (
    <div>
      <span>Loading: {String(context.loading)}</span>
      <span>Error: {context.error ?? "null"}</span>
      <span>Workflows: {context.workflows?.map((w) => w.id).join(", ")}</span>
      <button
        onClick={() => {
          void context.createWorkflow({
            action: { serviceId: 3, actionId: 3, actionBody: {} },
            reactions: [],
          });
        }}
      >
        Create
      </button>
      <button
        onClick={() => {
          void context.updateWorkflow(1, { toggle: false });
        }}
      >
        Update
      </button>
      <button
        onClick={() => {
          context.deleteWorkflow(2).catch(() => {});
        }}
      >
        Delete
      </button>
    </div>
  );
};

const renderWithAuth = (isAuthenticated: boolean): void => {
  render(
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user: null,
        token: null,
        login: vi.fn(),
        logout: vi.fn(),
        role: null,
        isAdmin: false,
      }}
    >
      <WorkflowsProvider>
        <TestConsumer />
      </WorkflowsProvider>
    </AuthContext.Provider>,
  );
};

describe("WorkflowsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiFetch.mockReset();
  });

  it("should fetch workflows when authenticated", async () => {
    mockedApiFetch.mockResolvedValue(mockWorkflows);
    renderWithAuth(true);
    expect(mockedApiFetch).toHaveBeenCalledWith("/api/workflow/list");
    expect(await screen.findByText("Workflows: 1, 2")).toBeInTheDocument();
  });

  it("should not fetch when unauthenticated", () => {
    renderWithAuth(false);
    expect(mockedApiFetch).not.toHaveBeenCalled();
    expect(screen.getByText("Workflows:")).toBeInTheDocument();
  });

  it("should handle createWorkflow", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockResolvedValueOnce(mockWorkflows);
    const newWorkflow = {
      id: 3,
      action: { serviceId: 3, actionId: 3, actionBody: {} },
      reactions: [],
    };
    mockedApiFetch.mockResolvedValueOnce(newWorkflow);

    renderWithAuth(true);
    expect(await screen.findByText("Workflows: 1, 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/api/workflow/create", {
        method: "POST",
        body: {
          action: { serviceId: 3, actionId: 3, actionBody: {} },
          reactions: [],
        },
      });
    });
    expect(await screen.findByText("Workflows: 1, 2, 3")).toBeInTheDocument();
  });

  it("should handle updateWorkflow", async () => {
    mockedApiFetch.mockResolvedValueOnce(mockWorkflows);
    const updatedWorkflow = { ...mockWorkflows[0], toggle: false };
    mockedApiFetch.mockResolvedValueOnce(updatedWorkflow);

    let context: WorkflowsContextType | undefined;
    render(
      <AuthContext.Provider
        value={{
          isAuthenticated: true,
          user: null,
          token: null,
          login: vi.fn(),
          logout: vi.fn(),
          role: null,
          isAdmin: false,
        }}
      >
        <WorkflowsProvider>
          <WorkflowsContext.Consumer>
            {(value): null => {
              context = value;
              return null;
            }}
          </WorkflowsContext.Consumer>
        </WorkflowsProvider>
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(context?.loading).toBe(false);
    });

    await act(async () => {
      await context?.updateWorkflow(1, { toggle: false });
    });

    expect(mockedApiFetch).toHaveBeenCalledWith("/api/workflow/edit/1", {
      method: "PATCH",
      body: { toggle: false },
    });
    await waitFor(() => {
      expect(context?.workflows?.find((w) => w.id === 1)?.toggle).toBe(false);
    });
  });

  it("should handle deleteWorkflow", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockResolvedValueOnce(mockWorkflows);
    mockedApiFetch.mockResolvedValueOnce(undefined);

    renderWithAuth(true);
    await screen.findByText("Workflows: 1, 2");

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/api/workflow/delete/2", {
        method: "DELETE",
      });
    });
    expect(await screen.findByText("Workflows: 1")).toBeInTheDocument();
  });

  it("should handle 404 on delete", async () => {
    const user = userEvent.setup();
    mockedApiFetch.mockResolvedValueOnce(mockWorkflows);
    mockedApiFetch.mockRejectedValueOnce(new ApiError("Not Found", 404));

    renderWithAuth(true);
    await screen.findByText("Workflows: 1, 2");

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("Workflows: 1")).toBeInTheDocument();
    });
  });

  it("should set error state on create failure", async () => {
    mockedApiFetch.mockResolvedValueOnce(mockWorkflows);
    const error = new Error("Creation failed");
    mockedApiFetch.mockRejectedValueOnce(error);

    let context: WorkflowsContextType | undefined;
    render(
      <AuthContext.Provider
        value={{
          isAuthenticated: true,
          user: null,
          token: null,
          login: vi.fn(),
          logout: vi.fn(),
          role: null,
          isAdmin: false,
        }}
      >
        <WorkflowsProvider>
          <WorkflowsContext.Consumer>
            {(value): null => {
              context = value;
              return null;
            }}
          </WorkflowsContext.Consumer>
        </WorkflowsProvider>
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(context?.loading).toBe(false);
    });
    await expect(
      context?.createWorkflow({
        action: { serviceId: 1, actionId: 1, actionBody: {} },
        reactions: [],
      }),
    ).rejects.toThrow("Creation failed");
  });
});
