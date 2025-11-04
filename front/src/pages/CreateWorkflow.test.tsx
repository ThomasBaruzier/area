import { render, screen, waitFor } from "@testing-library/react";
import {
  type InitialEntry,
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { MetadataContext } from "../context/MetadataContext";
import { WorkflowsContext } from "../context/WorkflowsContext";
import type { Workflow } from "../types/workflow";
import CreateWorkflow from "./CreateWorkflow";

vi.mock("../components/Workflows/WorkflowMindmap", () => ({
  default: ({
    initialNodes,
    workflowId,
  }: {
    initialNodes: unknown[];
    workflowId?: string;
  }): JSX.Element => (
    <div>
      <h2>WorkflowMindmap</h2>
      <div data-testid="workflow-id">{workflowId}</div>
      <div data-testid="nodes-count">{initialNodes.length}</div>
    </div>
  ),
}));

const mockWorkflows: Workflow[] = [
  {
    id: "123",
    action: { serviceId: 1, actionId: 1, actionBody: {} },
    reactions: [],
  },
];

const mockMetadataGetters = {
  services: [],
  loading: false,
  error: null,
  getService: vi.fn(),
  getActions: vi.fn().mockResolvedValue([]),
  getReactions: vi.fn().mockResolvedValue([]),
  getActionName: vi.fn(),
  getReactionName: vi.fn(),
};

const renderComponent = (
  path: string,
  initialEntries: InitialEntry[],
): void => {
  render(
    <WorkflowsContext.Provider
      value={{
        workflows: mockWorkflows,
        loading: false,
        error: null,
        createWorkflow: vi.fn(),
        updateWorkflow: vi.fn(),
        deleteWorkflow: vi.fn(),
      }}
    >
      <MetadataContext.Provider value={mockMetadataGetters}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path={path} element={<CreateWorkflow />} />
          </Routes>
        </MemoryRouter>
      </MetadataContext.Provider>
    </WorkflowsContext.Provider>,
  );
};

describe("CreateWorkflowPage", () => {
  it("should render in create mode", () => {
    renderComponent("/workflow/create", [{ pathname: "/workflow/create" }]);
    expect(screen.getByTestId("nodes-count")).toHaveTextContent("0");
    expect(screen.getByTestId("workflow-id")).toBeEmptyDOMElement();
  });

  it("should render in edit mode from params", async () => {
    renderComponent("/workflow/edit/:id", [{ pathname: "/workflow/edit/123" }]);

    await waitFor(() => {
      expect(screen.getByTestId("nodes-count")).toHaveTextContent("1");
    });
    expect(screen.getByTestId("workflow-id")).toHaveTextContent("123");
  });

  it("should render in edit mode from state", async () => {
    const wfFromState: Workflow = {
      id: "456",
      action: { serviceId: 2, actionId: 2, actionBody: {} },
      reactions: [{ serviceId: 3, reactionId: 3, reactionBody: {} }],
    };
    render(
      <WorkflowsContext.Provider
        value={{
          workflows: [],
          loading: false,
          error: null,
          createWorkflow: vi.fn(),
          updateWorkflow: vi.fn(),
          deleteWorkflow: vi.fn(),
        }}
      >
        <MetadataContext.Provider value={mockMetadataGetters}>
          <MemoryRouter
            initialEntries={[
              { pathname: "/workflow/edit/456", state: { wf: wfFromState } },
            ]}
          >
            <Routes>
              <Route path="/workflow/edit/:id" element={<CreateWorkflow />} />
            </Routes>
          </MemoryRouter>
        </MetadataContext.Provider>
      </WorkflowsContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("nodes-count")).toHaveTextContent("2");
    });
    expect(screen.getByTestId("workflow-id")).toHaveTextContent("456");
  });

  it("should show loading state for edit", () => {
    render(
      <WorkflowsContext.Provider
        value={{
          workflows: null,
          loading: true,
          error: null,
          createWorkflow: vi.fn(),
          updateWorkflow: vi.fn(),
          deleteWorkflow: vi.fn(),
        }}
      >
        <MetadataContext.Provider value={mockMetadataGetters}>
          <MemoryRouter initialEntries={["/workflow/edit/123"]}>
            <Routes>
              <Route path="/workflow/edit/:id" element={<CreateWorkflow />} />
            </Routes>
          </MemoryRouter>
        </MetadataContext.Provider>
      </WorkflowsContext.Provider>,
    );
    expect(screen.getByText("Loading workflow...")).toBeInTheDocument();
  });
});
