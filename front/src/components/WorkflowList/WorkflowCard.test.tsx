import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, type NavigateFunction } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Workflow } from "../../types/workflow";
import WorkflowCard from "./WorkflowCard";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useNavigate: (): NavigateFunction => mockNavigate,
  };
});

const mockWorkflow: Workflow & { actionName: string; reactionNames: string[] } =
  {
    id: "1",
    toggle: true,
    action: { serviceId: 1, actionId: 1, actionBody: { param: "value" } },
    reactions: [
      { serviceId: 2, reactionId: 2, reactionBody: { r_param: "r_value" } },
    ],
    actionName: "Test Action",
    reactionNames: ["Test Reaction"],
  };

describe("WorkflowCard", () => {
  const onDelete = vi.fn();
  const onToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (wf = mockWorkflow): void => {
    render(
      <MemoryRouter>
        <WorkflowCard wf={wf} onDelete={onDelete} onToggle={onToggle} />
      </MemoryRouter>,
    );
  };

  it("should render workflow info", () => {
    renderComponent();
    expect(screen.getByText("Test Action")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Reactions (1)")).toBeInTheDocument();
    expect(screen.getByText("Test Reaction")).toBeInTheDocument();
    expect(screen.getByText("param")).toBeInTheDocument();
    expect(screen.getByText("value")).toBeInTheDocument();
  });

  it('should show "Inactive" status', () => {
    renderComponent({ ...mockWorkflow, toggle: false });
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("should call onToggle on click", async () => {
    const user = userEvent.setup();
    renderComponent();
    const toggleButton = screen.getByTitle("Deactivate");
    await user.click(toggleButton);
    expect(onToggle).toHaveBeenCalledWith("1", false);
  });

  it("should call onDelete on click", async () => {
    const user = userEvent.setup();
    renderComponent();
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith("1");
  });

  it("should navigate to edit on click", async () => {
    const user = userEvent.setup();
    renderComponent();
    const editButton = screen.getByRole("button", { name: /edit/i });
    await user.click(editButton);
    expect(mockNavigate).toHaveBeenCalledWith("/workflow/edit/1", {
      state: { wf: mockWorkflow },
    });
  });
});
