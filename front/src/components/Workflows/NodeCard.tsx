import "reactflow/dist/style.css";
import "./WorkflowMindmap.css";

import React, { useRef } from "react";
import type { NodeProps } from "reactflow";
import { Handle, Position, useReactFlow } from "reactflow";

import type { ActionOrReaction } from "../../types/workflow";

type NodeData = {
  serviceId: number;
  serviceName: string;
  serviceColor?: string;
  item: ActionOrReaction;
  values?: Record<string, string>;
  onOpenEditor?: (id: string) => void;
};

export default function NodeCard({
  id,
  data,
}: NodeProps<NodeData>): JSX.Element {
  const { setNodes } = useReactFlow();

  const pressRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const openEditor = (): void => {
    if (typeof data.onOpenEditor === "function") data.onOpenEditor(id);
  };

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const target = e.target as HTMLElement;
    if (target.closest(".react-flow__handle")) return;
    pressRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const start = pressRef.current;
    pressRef.current = null;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dist = Math.hypot(dx, dy);
    const dt = Date.now() - start.t;

    if (dist < 10 && dt < 400) {
      openEditor();
    }
  };

  const removeSelf = (): void => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
  };

  const item = data.item;
  const isReaction = item.type === "reaction";

  return (
    <div
      className={`node-card ${isReaction ? "node-reaction" : "node-action"}`}
      role="button"
      aria-label={item.name}
      data-testid={`node-card-${item.name.replace(/\s+/g, "-")}`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openEditor();
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <div className="node-card-header">
        <div>
          <div className="node-service" style={{ color: data.serviceColor }}>
            {data.serviceName}
          </div>
          <div className="node-title">{item.name}</div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="node-remove"
            data-testid={`remove-node-${id}`}
            onClick={(e) => {
              e.stopPropagation();
              removeSelf();
            }}
            aria-label="Remove node"
            title="Remove"
          >
            ×
          </button>
        </div>
      </div>

      <div className="node-fields">
        {Object.keys(item.jsonFormat || {}).length === 0 && (
          <div className="node-empty">No fields</div>
        )}
        {Object.entries(item.jsonFormat || {}).map(([k]) => (
          <div key={k} className="node-field node-field-summary">
            <div className="node-field-label">{k}</div>
            <div className="node-field-value">
              {(data.values && data.values[k]) || (
                <span className="placeholder">—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isReaction && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="handle-big"
          style={{
            background: "var(--color-accent)",
            width: 18,
            height: 18,
            right: -8,
          }}
        />
      )}
      {!isReaction && (
        <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      )}

      {isReaction && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="handle-big"
          style={{
            background: "var(--color-accent-hover)",
            width: 18,
            height: 18,
            left: -8,
          }}
        />
      )}
      {isReaction && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ opacity: 0 }}
        />
      )}
    </div>
  );
}
