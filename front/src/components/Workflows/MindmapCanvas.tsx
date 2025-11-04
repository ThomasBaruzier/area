import "./WorkflowMindmap.css";

import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";

import type { ActionOrReaction, Service } from "../../types/workflow";

type NodeType = "action" | "reaction";

export default function MindmapCanvas({
  id: _id,
  data,
}: NodeProps<{
  type: NodeType;
  service: Service;
  actionOrReaction: ActionOrReaction;
  onConfig: () => void;
}>): JSX.Element {
  const { type, service, actionOrReaction, onConfig } = data;
  return (
    <div className={`mindmap-node node-${type}`}>
      <div className="mindmap-node-header">
        <span className="mindmap-node-type" style={{ color: service.color }}>
          {type === "action" ? "ACTION" : "REACTION"}
        </span>
        <span className="mindmap-node-service" style={{ color: service.color }}>
          {service.name}
        </span>
      </div>
      <div className="mindmap-node-title">{actionOrReaction.name}</div>
      <button className="mindmap-config-btn" onClick={onConfig}>
        Configurer
      </button>
      <Handle
        type="source"
        position={Position.Right}
        id="a"
        style={{ background: service.color, borderRadius: 6 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="b"
        style={{ background: service.color, borderRadius: 6 }}
      />
    </div>
  );
}
