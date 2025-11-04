import type { RenderResult } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, type NavigateFunction } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MetadataContext } from "../../context/MetadataContext";
import { WorkflowsContext } from "../../context/WorkflowsContext";
import WorkflowListView from "./WorkflowListView";

vi.mock("./WorkflowCard", () => ({
  default: ({
    wf,
    onDelete,
    onToggle,
  }: {
    wf: { id: number | string; actionName: string; toggle: boolean };
    onDelete: (id: number | string) => void;
    onToggle: (id: number | string, state: boolean) => void;
  }): JSX.Element => (
    <div role="article" aria-label={`Workflow ${String(wf.id)}`}>
      <h3>{wf.actionName}</h3>
      <button
        onClick={() => {
          onDelete(wf.id);
        }}
      >
        Delete
      </button>
      <button
        onClick={() => {
          onToggle(wf.id, !wf.toggle);
        }}
      >
        Toggle
      </button>
    </div>
  ),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useNavigate: (): NavigateFunction => mockNavigate,
  };
});

const mockWorkflows = [
  {
    id: 1,
    toggle: true,
    action: { serviceId: 1, actionId: 101, actionBody: {} },
    reactions: [{ serviceId: 2, reactionId: 201, reactionBody: {} }],
  },
  {
    id: 2,
    toggle: false,
    action: { serviceId: 1, actionId: 102, actionBody: {} },
    reactions: [],
  },
];

const mockGetActionName = vi.fn(
  (serviceId: number, actionId: number) =>
    `Action ${String(serviceId)}-${String(actionId)}`,
);
const mockGetReactionName = vi.fn(
  (serviceId: number, reactionId: number) =>
    `Reaction ${String(serviceId)}-${String(reactionId)}`,
);
const mockDeleteWorkflow = vi.fn();
const mockUpdateWorkflow = vi.fn();

const renderComponent = (
  workflows: typeof mockWorkflows | null,
  loading: boolean,
  error: string | null,
): RenderResult => {
  return render(
    <MemoryRouter>
      <WorkflowsContext.Provider
        value={{
          workflows,
          loading,
          error,
          deleteWorkflow: mockDeleteWorkflow,
          updateWorkflow: mockUpdateWorkflow,
          createWorkflow: vi.fn(),
        }}
      >
        <MetadataContext.Provider
          value={{
            getActionName: mockGetActionName,
            getReactionName: mockGetReactionName,
            services: [],
            loading: false,
            error: null,
            getService: vi.fn(),
            getActions: vi.fn(),
            getReactions: vi.fn(),
          }}
        >
          <WorkflowListView />
        </MetadataContext.Provider>
      </WorkflowsContext.Provider>
    </MemoryRouter>,
  );
};

describe("WorkflowListView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    renderComponent(null, true, null);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows error message", () => {
    renderComponent(null, false, "Failed to fetch");
    expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
  });

  it('shows "no workflows" message when list is empty', () => {
    renderComponent([], false, null);
    expect(screen.getByText("No workflows yet.")).toBeInTheDocument();
  });

  it("renders a list of workflows", () => {
    renderComponent(mockWorkflows, false, null);
    expect(screen.getByText("Action 1-101")).toBeInTheDocument();
    expect(screen.getByText("Action 1-102")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("navigates to create workflow page on button click", async () => {
    const user = userEvent.setup();
    renderComponent([], false, null);
    await user.click(screen.getByRole("button", { name: /create workflow/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/workflow/create");
  });

  it("calls deleteWorkflow when delete is triggered from a card", async () => {
    window.confirm = vi.fn(() => true);
    const user = userEvent.setup();
    renderComponent(mockWorkflows, false, null);

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith("Delete workflow #1 ?");
    expect(mockDeleteWorkflow).toHaveBeenCalledWith(1);
  });

  it("calls updateWorkflow when toggle is triggered from a card", async () => {
    const user = userEvent.setup();
    renderComponent(mockWorkflows, false, null);

    const toggleButtons = screen.getAllByRole("button", { name: /toggle/i });
    await user.click(toggleButtons[1]);

    expect(mockUpdateWorkflow).toHaveBeenCalledWith(2, { toggle: true });
  });
});
