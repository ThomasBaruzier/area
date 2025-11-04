import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, type NavigateFunction } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../auth/AuthProvider";
import { ConnectionsContext } from "../../auth/ConnectionsContext";
import { MetadataContext } from "../../context/MetadataContext";
import { WorkflowsContext } from "../../context/WorkflowsContext";
import type { ActionOrReaction, Service } from "../../types/workflow";
import WorkflowMindmap from "./WorkflowMindmap";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useNavigate: (): NavigateFunction => mockNavigate,
  };
});

const mockCreateWorkflow = vi.fn().mockResolvedValue({
  id: "new-workflow",
  action: { serviceId: 1, actionId: 10, actionBody: {} },
  reactions: [],
});
const mockUpdateWorkflow = vi.fn().mockResolvedValue({
  id: "updated-workflow",
  action: { serviceId: 1, actionId: 10, actionBody: {} },
  reactions: [],
});

const mockServices: Service[] = [
  {
    id: 1,
    name: "ServiceA",
    description: "",
    connectUrl: "http://example.com",
  },
];
const mockAction: ActionOrReaction = {
  id: 10,
  name: "Do Action",
  type: "action",
  jsonFormat: { field1: "string" },
  description: "",
};
const mockReaction: ActionOrReaction = {
  id: 20,
  name: "Do Reaction",
  type: "reaction",
  jsonFormat: { field2: "string" },
  description: "",
};

const renderComponent = (props = {}): void => {
  render(
    <div style={{ width: 800, height: 600 }}>
      <ReactFlowProvider>
        <MemoryRouter>
          <AuthProvider>
            <WorkflowsContext.Provider
              value={{
                createWorkflow: mockCreateWorkflow,
                updateWorkflow: mockUpdateWorkflow,
                workflows: [],
                loading: false,
                error: null,
                deleteWorkflow: vi.fn(),
              }}
            >
              <MetadataContext.Provider
                value={{
                  services: mockServices,
                  loading: false,
                  error: null,
                  getActions: vi.fn().mockResolvedValue([mockAction]),
                  getReactions: vi.fn().mockResolvedValue([mockReaction]),
                  getService: vi.fn(),
                  getActionName: vi.fn(),
                  getReactionName: vi.fn(),
                }}
              >
                <ConnectionsContext.Provider
                  value={{
                    connections: ["servicea"],
                    isConnected: () => true,
                    fetchConnections: vi.fn(),
                  }}
                >
                  <WorkflowMindmap {...props} />
                </ConnectionsContext.Provider>
              </MetadataContext.Provider>
            </WorkflowsContext.Provider>
          </AuthProvider>
        </MemoryRouter>
      </ReactFlowProvider>
    </div>,
  );
};

describe("WorkflowMindmap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add an action node", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: "Add Action" }));

    const serviceSelect = await screen.findByRole("combobox", {
      name: "Service",
    });
    await user.selectOptions(serviceSelect, "ServiceA");

    const actionSelect = await screen.findByRole("combobox", {
      name: "Action",
    });
    await waitFor(() => {
      expect(actionSelect).not.toBeDisabled();
    });
    await user.selectOptions(actionSelect, "Do Action");

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Do Action")).toBeInTheDocument();
  });

  describe("Validation", () => {
    it("should validate for missing action/nodes", async () => {
      const user = userEvent.setup();
      renderComponent();
      await user.click(screen.getByRole("button", { name: "Save Workflow" }));
      expect(
        await screen.findByText(
          /The workflow is empty. Please add one Action and at least one Reaction./,
        ),
      ).toBeInTheDocument();
      expect(mockCreateWorkflow).not.toHaveBeenCalled();
    });

    it("should validate for missing reactions", async () => {
      const user = userEvent.setup();
      renderComponent();
      await user.click(screen.getByRole("button", { name: "Add Action" }));
      await user.selectOptions(
        await screen.findByRole("combobox", { name: "Service" }),
        "ServiceA",
      );
      await user.selectOptions(
        await screen.findByRole("combobox", { name: "Action" }),
        "Do Action",
      );
      await user.click(screen.getByRole("button", { name: "Add" }));
      await screen.findByText("Do Action");
      await user.click(screen.getByRole("button", { name: "Save Workflow" }));
      expect(
        await screen.findByText("You need at least one Reaction."),
      ).toBeInTheDocument();
    });

    it("should validate for incomplete node configuration", async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByRole("button", { name: "Add Action" }));
      await user.selectOptions(
        await screen.findByRole("combobox", { name: "Service" }),
        "ServiceA",
      );
      await user.selectOptions(
        await screen.findByRole("combobox", { name: "Action" }),
        "Do Action",
      );
      await user.click(screen.getByRole("button", { name: "Add" }));

      await user.click(screen.getByRole("button", { name: "Add Reaction" }));
      await user.selectOptions(
        await screen.findByRole("combobox", { name: "Service" }),
        "ServiceA",
      );
      await user.selectOptions(
        await screen.findByRole("combobox", { name: "Reaction" }),
        "Do Reaction",
      );
      await user.click(screen.getByRole("button", { name: "Add" }));

      await screen.findByText("Do Action");
      await screen.findByText("Do Reaction");

      await user.click(screen.getByRole("button", { name: "Save Workflow" }));
      expect(
        await screen.findByText(
          'The field "field1" of node "Do Action" is empty.',
        ),
      ).toBeInTheDocument();
    });
  });
});
