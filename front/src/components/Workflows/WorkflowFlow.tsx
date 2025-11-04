import "reactflow/dist/style.css";

import React, { useCallback } from "react";
import type {
  Connection,
  Edge,
  Node,
  NodeTypes,
  OnEdgesChange,
  OnNodesChange,
} from "reactflow";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
} from "reactflow";

import NodeCard from "./NodeCard";

type Props = {
  nodes: Node[];
  setNodes: (nodes: Node[]) => void;
  edges: Edge[];
  setEdges: (edges: Edge[]) => void;
  onConfigClick?: (nodeId: string) => void;
};

const nodeTypes: NodeTypes = {
  areaNode: NodeCard,
};

export default function WorkflowFlow({
  nodes,
  setNodes,
  edges,
  setEdges,
}: Props): JSX.Element {
  const onNodesChange = useCallback<OnNodesChange>(
    (changes) => {
      setNodes(applyNodeChanges(changes, nodes));
    },
    [nodes, setNodes],
  );

  const onEdgesChange = useCallback<OnEdgesChange>(
    (changes) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const next = addEdge(params, edges);
      setEdges(next);
    },
    [edges, setEdges],
  );

  return (
    <div className="mindmap-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.4}
        maxZoom={1.3}
        style={{ width: "100%", minHeight: 600, background: "none" }}
      >
        <Background gap={20} size={1.5} color="#4D645230" />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}
