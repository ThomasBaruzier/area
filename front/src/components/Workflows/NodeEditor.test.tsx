import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Node, useReactFlow } from "reactflow";
import { describe, expect, it, vi } from "vitest";

import type { NodeData } from "../../types/workflow";
import NodeEditor from "./NodeEditor";

vi.mock("reactflow", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useReactFlow: vi.fn(),
  };
});

const mockedUseReactFlow = vi.mocked(useReactFlow);

const mockNode: Node<NodeData> = {
  id: "node-1",
  position: { x: 0, y: 0 },
  data: {
    serviceId: 1,
    serviceName: "Test Service",
    item: {
      id: 101,
      name: "Test Action",
      description: "A test action",
      type: "action" as const,
      jsonFormat: { param1: "string", param2: "number" },
    },
    values: { param1: "initial value" },
  },
};

const mockGetNode = vi.fn().mockReturnValue(mockNode);
const mockSetNodes = vi.fn();

const renderComponent = (onClose = vi.fn()): void => {
  mockedUseReactFlow.mockReturnValue({
    getNode: mockGetNode,
    setNodes: mockSetNodes,
  } as unknown as ReturnType<typeof useReactFlow>);

  render(<NodeEditor nodeId="node-1" onClose={onClose} />);
};

describe("NodeEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render editor with correct data", () => {
    renderComponent();
    expect(
      screen.getByRole("heading", { name: /edit: a test action/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Test Service")).toBeInTheDocument();
    expect(screen.getByLabelText("param1")).toBeInTheDocument();
    expect(screen.getByLabelText("param2")).toBeInTheDocument();
  });

  it("should populate fields with existing values", () => {
    renderComponent();
    expect(screen.getByLabelText("param1")).toHaveValue("initial value");
    expect(screen.getByLabelText("param2")).toHaveValue("");
  });

  it("should render 'no fields' message if jsonFormat is empty", () => {
    mockGetNode.mockReturnValueOnce({
      ...mockNode,
      data: {
        ...mockNode.data,
        item: { ...mockNode.data.item, jsonFormat: {} },
      },
    });
    renderComponent();
    expect(screen.getByText("No fields to edit.")).toBeInTheDocument();
  });

  it("should allow changing input values", async () => {
    const user = userEvent.setup();
    renderComponent();
    const input = screen.getByLabelText("param1");
    await user.clear(input);
    await user.type(input, "new value");
    expect(input).toHaveValue("new value");
  });

  it("should close on cancel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderComponent(onClose);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockSetNodes).not.toHaveBeenCalled();
  });

  it("should save and close", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderComponent(onClose);

    const input1 = screen.getByLabelText("param1");
    await user.clear(input1);
    await user.type(input1, "updated value");

    const input2 = screen.getByLabelText("param2");
    await user.type(input2, "123");

    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(mockSetNodes).toHaveBeenCalledTimes(1);
    const setNodesUpdater = mockSetNodes.mock.calls[0][0] as (
      nodes: Node<NodeData>[],
    ) => Node<NodeData>[];
    const newNodes = setNodesUpdater([mockNode]);

    expect(newNodes[0]?.data.values).toEqual({
      param1: "updated value",
      param2: "123",
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
