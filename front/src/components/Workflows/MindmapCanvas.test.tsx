import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NodeProps } from "reactflow";
import { ReactFlowProvider } from "reactflow";
import { describe, expect, it, vi } from "vitest";

import type { ActionOrReaction, Service } from "../../types/workflow";
import MindmapCanvas from "./MindmapCanvas";

const mockOnConfig = vi.fn();

const mockService: Service = {
  id: 1,
  name: "GitHub",
  color: "#ff0000",
  connectUrl: "",
};
const mockAction: ActionOrReaction = {
  id: 10,
  name: "New Commit",
  type: "action",
  description: "",
};
const mockReaction: ActionOrReaction = {
  id: 20,
  name: "Create Issue",
  type: "reaction",
  description: "",
};

const baseProps: NodeProps = {
  id: "1",
  data: {},
  xPos: 0,
  yPos: 0,
  zIndex: 0,
  isConnectable: true,
  selected: false,
  dragging: false,
  type: "areaNode",
};

describe("MindmapCanvas", () => {
  it("renders an ACTION node correctly", () => {
    render(
      <ReactFlowProvider>
        <MindmapCanvas
          {...baseProps}
          data={{
            type: "action",
            service: mockService,
            actionOrReaction: mockAction,
            onConfig: mockOnConfig,
          }}
        />
      </ReactFlowProvider>,
    );

    expect(screen.getByText("ACTION")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("New Commit")).toBeInTheDocument();
    expect(screen.getByText("ACTION")).toHaveStyle({ color: "rgb(255, 0, 0)" });
  });

  it("renders a REACTION node correctly", () => {
    render(
      <ReactFlowProvider>
        <MindmapCanvas
          {...baseProps}
          data={{
            type: "reaction",
            service: mockService,
            actionOrReaction: mockReaction,
            onConfig: mockOnConfig,
          }}
        />
      </ReactFlowProvider>,
    );

    expect(screen.getByText("REACTION")).toBeInTheDocument();
    expect(screen.getByText("Create Issue")).toBeInTheDocument();
  });

  it("calls onConfig when the config button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ReactFlowProvider>
        <MindmapCanvas
          {...baseProps}
          data={{
            type: "action",
            service: mockService,
            actionOrReaction: mockAction,
            onConfig: mockOnConfig,
          }}
        />
      </ReactFlowProvider>,
    );

    const configButton = screen.getByRole("button", { name: "Configurer" });
    await user.click(configButton);

    expect(mockOnConfig).toHaveBeenCalledTimes(1);
  });
});
