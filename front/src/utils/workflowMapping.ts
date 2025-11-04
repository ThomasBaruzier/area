import type { Edge, Node } from "reactflow";

import type {
  ActionOrReaction,
  NodeData,
  Service,
  Workflow,
} from "../types/workflow";

type Getters = {
  getService: (id: number | string) => Service | undefined;
  getActions: (serviceId: number | string) => Promise<ActionOrReaction[]>;
  getReactions: (serviceId: number | string) => Promise<ActionOrReaction[]>;
};

function safeGetValues(body: unknown): Record<string, string> {
  if (body !== null && typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, string>;
  }
  return {};
}

export async function buildFlowFromWorkflow(
  wf: Workflow,
  getters: Getters,
): Promise<{ nodes: Node<NodeData>[]; edges: Edge[] }> {
  const nodes: Node<NodeData>[] = [];
  const edges: Edge[] = [];

  const { getService, getActions, getReactions } = getters;

  const actionService = getService(wf.action.serviceId);
  const actionList = await getActions(wf.action.serviceId);
  const aMeta = actionList.find((a) => a.id === wf.action.actionId) ?? {
    id: wf.action.actionId,
    name: `Action ${String(wf.action.actionId)}`,
    type: "action",
    jsonFormat: {},
    description: "",
  };

  const actionNodeId = `action-${String(aMeta.id)}`;

  nodes.push({
    id: actionNodeId,
    type: "areaNode",
    position: { x: 140, y: 220 },
    draggable: true,
    data: {
      serviceId: wf.action.serviceId,
      serviceName:
        actionService?.name ?? `Service ${String(wf.action.serviceId)}`,
      serviceColor: actionService?.color ?? "var(--color-accent)",
      item: { ...aMeta, type: "action" },
      values: safeGetValues(wf.action.actionBody),
    },
  });

  const yStart = 120;
  const yStep = 200;
  const xRight = 560;

  for (let i = 0; i < wf.reactions.length; i++) {
    const r = wf.reactions[i];
    const rService = getService(r.serviceId);
    const rList = await getReactions(r.serviceId);
    const rMeta = rList.find((x) => x.id === r.reactionId) ?? {
      id: r.reactionId,
      name: `Reaction ${String(r.reactionId)}`,
      type: "reaction",
      jsonFormat: {},
      description: "",
    };

    const rid = `reaction-${String(rMeta.id)}-${String(i)}`;

    nodes.push({
      id: rid,
      type: "areaNode",
      position: { x: xRight, y: yStart + i * yStep },
      draggable: true,
      data: {
        serviceId: r.serviceId,
        serviceName: rService?.name ?? `Service ${String(r.serviceId)}`,
        serviceColor: rService?.color ?? "var(--color-accent)",
        item: { ...rMeta, type: "reaction" },
        values: safeGetValues(r.reactionBody),
      },
    });

    edges.push({
      id: `e-${actionNodeId}-${rid}`,
      source: actionNodeId,
      target: rid,
    });
  }

  return { nodes, edges };
}
