import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WorkflowsListPage from "./WorkflowList";

vi.mock("../components/WorkflowList/WorkflowListView", () => ({
  default: (): JSX.Element => (
    <div data-testid="workflow-list-view-component" />
  ),
}));

describe("WorkflowsListPage", (): void => {
  it("renders the WorkflowListView component", (): void => {
    render(<WorkflowsListPage />);
    expect(
      screen.getByTestId("workflow-list-view-component"),
    ).toBeInTheDocument();
  });
});
