import { render, screen } from "@testing-library/react";
import type { Edge, Node } from "reactflow";
import ReactFlow from "reactflow";
import { describe, expect, it, vi } from "vitest";

import WorkflowFlow from "./WorkflowFlow";

vi.mock("reactflow", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactFlow>();
  const ReactFlowMock = (props: { children?: React.ReactNode }) => (
    <div>{props.children}</div>
  );
  return {
    ...actual,
    default: vi.fn(ReactFlowMock),
    Background: vi.fn(() => <div data-testid="background" />),
    MiniMap: vi.fn(() => <div data-testid="minimap" />),
    Controls: vi.fn(() => <div data-testid="controls" />),
  };
});

const MockedReactFlow = vi.mocked(ReactFlow);

describe("WorkflowFlow", () => {
  const mockNodes: Node[] = [{ id: "1", position: { x: 0, y: 0 }, data: {} }];
  const mockEdges: Edge[] = [];
  const mockSetNodes = vi.fn();
  const mockSetEdges = vi.fn();

  it("renders ReactFlow with UI components", () => {
    render(
      <WorkflowFlow
        nodes={mockNodes}
        edges={mockEdges}
        setNodes={mockSetNodes}
        setEdges={mockSetEdges}
      />,
    );

    expect(screen.getByTestId("background")).toBeInTheDocument();
    expect(screen.getByTestId("minimap")).toBeInTheDocument();
    expect(screen.getByTestId("controls")).toBeInTheDocument();
  });

  it("passes correct props to ReactFlow", () => {
    render(
      <WorkflowFlow
        nodes={mockNodes}
        edges={mockEdges}
        setNodes={mockSetNodes}
        setEdges={mockSetEdges}
      />,
    );

    expect(MockedReactFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        nodes: mockNodes,
        edges: mockEdges,
        fitView: true,
        proOptions: { hideAttribution: true },
        minZoom: 0.4,
        maxZoom: 1.3,
        style: {
          width: "100%",
          minHeight: 600,
          background: "none",
        },
      }),
      undefined,
    );
  });
});
