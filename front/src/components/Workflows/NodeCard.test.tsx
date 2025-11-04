import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Node, NodeProps } from "reactflow";
import { ReactFlowProvider, useReactFlow } from "reactflow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NodeData } from "../../types/workflow";
import NodeCard from "./NodeCard";

vi.mock("reactflow", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useReactFlow: vi.fn(),
  };
});

const mockedUseReactFlow = vi.mocked(useReactFlow);

const mockSetNodes = vi.fn();
const mockOnOpenEditor = vi.fn();

const nodeProps: NodeProps<NodeData> = {
  id: "node-1",
  data: {
    serviceId: 1,
    serviceName: "Test Service",
    item: {
      id: 101,
      name: "Test Action",
      type: "action" as const,
      description: "",
    },
    onOpenEditor: mockOnOpenEditor,
  },
  xPos: 0,
  yPos: 0,
  zIndex: 1,
  isConnectable: true,
  selected: false,
  dragging: false,
  type: "areaNode",
};

const renderComponent = (props: NodeProps<NodeData> = nodeProps): void => {
  mockedUseReactFlow.mockReturnValue({
    setNodes: mockSetNodes,
  } as unknown as ReturnType<typeof useReactFlow>);

  render(
    <ReactFlowProvider>
      <NodeCard {...props} />
    </ReactFlowProvider>,
  );
};

describe("NodeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render node data", () => {
    renderComponent();
    expect(screen.getByText("Test Service")).toBeInTheDocument();
    expect(screen.getByText("Test Action")).toBeInTheDocument();
  });

  it("should open editor on click", async () => {
    const user = userEvent.setup();
    renderComponent();
    const card = screen.getByRole("button", { name: "Test Action" });
    await user.click(card);
    expect(mockOnOpenEditor).toHaveBeenCalledWith("node-1");
  });

  it("should open editor on Enter", async () => {
    const user = userEvent.setup();
    renderComponent();
    const card = screen.getByRole("button", { name: "Test Action" });
    card.focus();
    await user.keyboard("{Enter}");
    expect(mockOnOpenEditor).toHaveBeenCalledWith("node-1");
  });

  it("should remove self on click", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole("button", { name: "Remove node" }));

    expect(mockSetNodes).toHaveBeenCalledTimes(1);
    const updater = mockSetNodes.mock.calls[0][0] as (nodes: Node[]) => Node[];
    const newNodes = updater([
      { id: "node-1", data: {}, position: { x: 0, y: 0 } },
      { id: "node-2", data: {}, position: { x: 0, y: 0 } },
    ]);
    expect(newNodes).toEqual([
      { id: "node-2", data: {}, position: { x: 0, y: 0 } },
    ]);
  });

  it("should not open editor on drag", () => {
    renderComponent();
    const card = screen.getByRole("button", { name: "Test Action" });

    fireEvent.pointerDown(card, { clientX: 10, clientY: 10 });
    fireEvent.pointerUp(card, { clientX: 30, clientY: 30 });

    expect(mockOnOpenEditor).not.toHaveBeenCalled();
  });
});
