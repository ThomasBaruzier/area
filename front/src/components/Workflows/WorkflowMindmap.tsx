import "reactflow/dist/style.css";
import "./WorkflowMindmap.css";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Connection, Edge, Node } from "reactflow";
import ReactFlow, {
  addEdge,
  Background,
  useEdgesState,
  useNodesState,
} from "reactflow";

import { useWorkflows } from "../../context/useWorkflows";
import type {
  ActionOrReaction,
  CreateWorkflowDto,
  NodeData,
  Service,
} from "../../types/workflow";
import NodeCard from "./NodeCard";
import NodeEditor from "./NodeEditor";
import ServicePicker from "./ServicePicker";

const nodeTypes = { areaNode: NodeCard };

type Props = {
  initialNodes?: Node<NodeData>[];
  initialEdges?: Edge[];
  workflowId?: number | string;
  initialToggle?: boolean | null;
};

const WorkflowMindmap: React.FC<Props> = ({
  initialNodes = [],
  initialEdges = [],
  workflowId,
  initialToggle = true,
}): JSX.Element => {
  const navigate = useNavigate();
  const { createWorkflow, updateWorkflow } = useWorkflows();
  const [nodes, setNodes, onNodesChange] =
    useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [pickerMode, setPickerMode] = useState<"action" | "reaction" | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onOpenEditor = useCallback((nodeId: string): void => {
    setSelectedNodeId(nodeId);
  }, []);

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current && workflowId === undefined) {
      return;
    }
    if (initialNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      initRef.current = true;
      return;
    }

    const reactions = initialNodes.filter(
      (n) => n.data.item.type === "reaction",
    );
    const laidOut = initialNodes.map((n) => {
      const commonData = {
        ...n.data,
        onOpenEditor: onOpenEditor,
      };
      if (n.data.item.type === "action") {
        return { ...n, position: { x: 120, y: 220 }, data: commonData };
      }
      const i = reactions.findIndex((r) => r.id === n.id);
      return {
        ...n,
        position: { x: 620, y: 140 + i * 220 },
        data: commonData,
      };
    });
    setNodes(laidOut);
    setEdges(initialEdges);
    initRef.current = true;
  }, [
    workflowId,
    initialNodes,
    initialEdges,
    onOpenEditor,
    setNodes,
    setEdges,
  ]);

  const onConnect = useCallback(
    (p: Edge | Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...p,
            animated: true,
            style: { stroke: "var(--color-accent)" },
          } as Edge,
          eds,
        ),
      );
    },
    [setEdges],
  );

  const openPicker = (mode: "action" | "reaction"): void => {
    setPickerMode(mode);
    setPickerOpen(true);
  };

  const onConfirmPicker = (
    service: Service,
    selected: ActionOrReaction,
  ): void => {
    const isAction = selected.type === "action";
    const existingCount = nodes.filter(
      (n) => n.data.item.type === selected.type,
    ).length;
    const pos = {
      x: isAction ? 100 : 450,
      y: 150 + (isAction ? 0 : existingCount * 200),
    };

    const id = `${selected.type}-${String(selected.id)}-${String(Date.now())}`;
    const node: Node<NodeData> = {
      id,
      type: "areaNode",
      position: pos,
      draggable: true,
      data: {
        serviceId: service.id,
        serviceName: service.name,
        serviceColor: service.color,
        item: { ...selected, type: selected.type },
        values: {},
        onOpenEditor: onOpenEditor,
      },
    };
    setNodes((nds) => nds.concat(node));
    setPickerOpen(false);
    setPickerMode(null);
  };

  const validateWorkflow = async (): Promise<void> => {
    setMessage(null);
    if (!nodes.length) {
      setMessage(
        "The workflow is empty. Please add one Action and at least one Reaction.",
      );
      return;
    }
    const actions = nodes.filter((n) => n.data.item.type === "action");
    const reactions = nodes.filter((n) => n.data.item.type === "reaction");
    if (actions.length !== 1) {
      setMessage(
        actions.length === 0
          ? "You need exactly one Action."
          : "Only one Action is allowed.",
      );
      return;
    }
    if (!reactions.length) {
      setMessage("You need at least one Reaction.");
      return;
    }

    for (const n of nodes) {
      const fmt = n.data.item.jsonFormat || {};
      const objValues = n.data.values || {};
      for (const k of Object.keys(fmt)) {
        const v = objValues[k];
        if (typeof v !== "string" || v.trim() === "") {
          setMessage(
            `The field "${k}" of node "${
              n.data.item.description || n.data.item.name
            }" is empty.`,
          );
          return;
        }
      }
    }

    const action = actions[0];
    const incomingFromAction = (rid: string): boolean =>
      edges.some((e) => e.target === rid && e.source === action.id);
    for (const r of reactions)
      if (!incomingFromAction(r.id)) {
        setMessage(
          `The reaction "${
            r.data.item.description || r.data.item.name
          }" must be linked from the Action "${
            action.data.item.description || action.data.item.name
          }".`,
        );
        return;
      }

    const isEditing = workflowId !== undefined;

    const payload: CreateWorkflowDto = {
      toggle: initialToggle ?? true,
      action: {
        serviceId: action.data.serviceId,
        actionId: action.data.item.id,
        actionBody: action.data.values || {},
      },
      reactions: reactions
        .filter((r) => incomingFromAction(r.id))
        .map((r) => ({
          serviceId: r.data.serviceId,
          reactionId: r.data.item.id,
          reactionBody: r.data.values || {},
        })),
    };

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateWorkflow(workflowId, payload);
      } else {
        await createWorkflow(payload);
      }
      void navigate("/workflow/list");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed to save workflow.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="workflow-shell card">
      <div className="workflow-toolbar">
        <div className="workflow-actions">
          <button
            className="wf-btn"
            onClick={() => {
              openPicker("action");
            }}
            type="button"
            title="Add action"
            disabled={nodes.some((n) => n.data.item.type === "action")}
            data-testid="add-action-button"
          >
            Add Action
          </button>
          <button
            className="wf-btn"
            onClick={() => {
              openPicker("reaction");
            }}
            type="button"
            title="Add reaction"
            data-testid="add-reaction-button"
          >
            Add Reaction
          </button>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <button
            className="wf-btn wf-validate"
            onClick={() => {
              void validateWorkflow();
            }}
            type="button"
            disabled={submitting}
            data-testid="save-workflow-button"
          >
            {submitting ? "Saving…" : "Save Workflow"}
          </button>
        </div>
      </div>

      <div className="workflow-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable
          nodesConnectable
          elementsSelectable
          panOnDrag={[1, 2]}
          selectionOnDrag={false}
          panOnScroll
          zoomOnScroll
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} color="rgba(0,0,0,0.06)" />
        </ReactFlow>
      </div>

      {pickerOpen && pickerMode && (
        <ServicePicker
          mode={pickerMode}
          onClose={() => {
            setPickerOpen(false);
            setPickerMode(null);
          }}
          onConfirm={onConfirmPicker}
        />
      )}

      {selectedNodeId && (
        <NodeEditor
          nodeId={selectedNodeId}
          onClose={() => {
            setSelectedNodeId(null);
          }}
        />
      )}

      {message && (
        <div
          className="workflow-message card"
          data-testid="workflow-validation-message"
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default WorkflowMindmap;
