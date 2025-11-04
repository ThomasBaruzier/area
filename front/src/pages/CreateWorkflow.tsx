import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import type { Edge, Node } from "reactflow";
import { ReactFlowProvider } from "reactflow";

import WorkflowMindmap from "../components/Workflows/WorkflowMindmap";
import { useMetadata } from "../context/useMetadata";
import { useWorkflows } from "../context/useWorkflows";
import type { NodeData, Workflow } from "../types/workflow";
import { buildFlowFromWorkflow } from "../utils/workflowMapping";

function isWorkflowState(state: unknown): state is { wf: Workflow } {
  return state !== null && typeof state === "object" && "wf" in state;
}

export default function CreateWorkflow(): JSX.Element {
  const { id: idParam } = useParams();
  const location = useLocation();
  const passed: Workflow | undefined = isWorkflowState(location.state)
    ? location.state.wf
    : undefined;

  const { workflows, loading: workflowsLoading } = useWorkflows();
  const metadataGetters = useMetadata();

  const workflowId = passed?.id ?? idParam;
  const [wf, setWf] = useState<Workflow | null>(passed ?? null);

  const [initialNodes, setInitialNodes] = useState<Node<NodeData>[]>([]);
  const [initialEdges, setInitialEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (passed) {
      setWf(passed);
    } else if (workflowId && workflows) {
      const found = workflows.find((w) => String(w.id) === String(workflowId));
      setWf(found ?? null);
    }
  }, [workflowId, workflows, passed]);

  useEffect(() => {
    void (async (): Promise<void> => {
      setLoading(true);
      if (!wf) {
        setInitialNodes([]);
        setInitialEdges([]);
        setLoading(false);
        return;
      }
      try {
        const { nodes, edges } = await buildFlowFromWorkflow(
          wf,
          metadataGetters,
        );
        setInitialNodes(nodes);
        setInitialEdges(edges);
      } catch {
        setInitialNodes([]);
        setInitialEdges([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [wf, metadataGetters]);

  const initialToggle = useMemo<boolean>(() => wf?.toggle ?? true, [wf]);

  if (workflowId && workflowsLoading) {
    return <div>Loading workflow...</div>;
  }

  if (loading && workflowId) {
    return <div>Building workflow...</div>;
  }

  return (
    <ReactFlowProvider>
      <WorkflowMindmap
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        workflowId={workflowId}
        initialToggle={initialToggle}
      />
    </ReactFlowProvider>
  );
}
