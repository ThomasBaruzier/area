import { describe, expect, it, vi } from "vitest";

import type { Workflow } from "../types/workflow";
import { buildFlowFromWorkflow } from "./workflowMapping";

describe("buildFlowFromWorkflow", () => {
  it("should transform workflow to flow data", async () => {
    const mockWorkflow: Workflow = {
      id: 1,
      toggle: true,
      action: {
        serviceId: 1,
        actionId: 101,
        actionBody: { param1: "value1" },
      },
      reactions: [
        {
          serviceId: 2,
          reactionId: 201,
          reactionBody: { param2: "value2" },
        },
        {
          serviceId: 2,
          reactionId: 202,
          reactionBody: { param3: "value3" },
        },
      ],
    };

    const mockGetters = {
      getService: vi.fn((id) => {
        if (id === 1)
          return {
            id: 1,
            name: "Service A",
            color: "#ff0000",
            connectUrl: "http://example.com",
          };
        if (id === 2)
          return {
            id: 2,
            name: "Service B",
            color: "#00ff00",
            connectUrl: "http://example.com",
          };
        return undefined;
      }),
      getActions: vi.fn((serviceId) => {
        if (serviceId === 1) {
          return Promise.resolve([
            {
              id: 101,
              name: "Action One",
              jsonFormat: { param1: "string" },
              type: "action" as const,
              description: "",
            },
          ]);
        }
        return Promise.resolve([]);
      }),
      getReactions: vi.fn((serviceId) => {
        if (serviceId === 2) {
          return Promise.resolve([
            {
              id: 201,
              name: "Reaction One",
              jsonFormat: { param2: "string" },
              type: "reaction" as const,
              description: "",
            },
            {
              id: 202,
              name: "Reaction Two",
              jsonFormat: { param3: "string" },
              type: "reaction" as const,
              description: "",
            },
          ]);
        }
        return Promise.resolve([]);
      }),
    };

    const { nodes, edges } = await buildFlowFromWorkflow(
      mockWorkflow,
      mockGetters,
    );

    expect(nodes).toHaveLength(3);

    const actionNode = nodes.find((n) => n.data.item.type === "action");
    expect(actionNode).toBeDefined();
    expect(actionNode?.id).toBe("action-101");
    expect(actionNode?.data.serviceName).toBe("Service A");
    expect(actionNode?.data.item.name).toBe("Action One");
    expect(actionNode?.data.values).toEqual({ param1: "value1" });

    const reactionNodes = nodes.filter((n) => n.data.item.type === "reaction");
    expect(reactionNodes).toHaveLength(2);
    expect(reactionNodes[0]?.data.serviceName).toBe("Service B");
    expect(reactionNodes[0]?.data.item.name).toBe("Reaction One");
    expect(reactionNodes[0]?.data.values).toEqual({ param2: "value2" });
    expect(reactionNodes[1]?.data.item.name).toBe("Reaction Two");

    expect(edges).toHaveLength(2);
    expect(edges[0].source).toBe(actionNode?.id);
    expect(edges[0].target).toBe(reactionNodes[0]?.id);
    expect(edges[1].source).toBe(actionNode?.id);
    expect(edges[1].target).toBe(reactionNodes[1]?.id);
  });

  it("should handle missing metadata", async () => {
    const mockWorkflow: Workflow = {
      id: 2,
      action: { serviceId: 99, actionId: 999, actionBody: {} },
      reactions: [],
    };

    const mockGetters = {
      getService: vi.fn(() => undefined),
      getActions: vi.fn(() => Promise.resolve([])),
      getReactions: vi.fn(() => Promise.resolve([])),
    };

    const { nodes } = await buildFlowFromWorkflow(mockWorkflow, mockGetters);

    expect(nodes).toHaveLength(1);
    const actionNode = nodes[0];
    expect(actionNode.data.serviceName).toBe("Service 99");
    expect(actionNode.data.item.name).toBe("Action 999");
  });
});
