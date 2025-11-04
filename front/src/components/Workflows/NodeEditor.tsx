import "./WorkflowMindmap.css";

import React, { useState } from "react";
import { useReactFlow } from "reactflow";

import type { NodeData } from "../../types/workflow";
import Modal from "../common/Modal";

export default function NodeEditor({
  nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}): JSX.Element {
  const { getNode, setNodes } = useReactFlow<NodeData>();
  const node = getNode(nodeId);

  const [localValues, setLocalValues] = useState<Record<string, string>>(() => {
    if (!node) return {};
    return node.data.values ? { ...node.data.values } : {};
  });

  if (!node) return <></>;

  const fields = Object.keys(node.data.item.jsonFormat || {});
  const onChangeField = (k: string, v: string): void => {
    setLocalValues((s) => ({ ...s, [k]: v }));
  };
  const onSave = (): void => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, values: { ...localValues } } }
          : n,
      ),
    );
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      className="picker workflow-modal"
      data-testid="node-editor-modal"
    >
      <div className="wf-modal-content">
        <h2>Edit: {node.data.item.description || node.data.item.name}</h2>
        <p style={{ marginTop: 8, color: "var(--color-text-muted)" }}>
          {node.data.serviceName}
        </p>

        <div style={{ marginTop: "var(--space-3)", display: "grid", gap: 12 }}>
          {fields.length === 0 && <div>No fields to edit.</div>}
          {fields.map((k) => (
            <label
              key={k}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div
                style={{ fontWeight: 600, color: "var(--color-text-muted)" }}
              >
                {k}
              </div>
              <input
                data-testid={`node-input-${k}`}
                className="input"
                value={localValues[k] || ""}
                onChange={(e) => {
                  onChangeField(k, e.target.value);
                }}
                placeholder={`Enter ${k}`}
              />
            </label>
          ))}

          <div className="wf-modal-actions">
            <button
              className="wf-btn"
              onClick={onClose}
              type="button"
              data-testid="cancel-node-button"
            >
              Cancel
            </button>
            <button
              className="wf-btn"
              onClick={onSave}
              type="button"
              data-testid="save-node-button"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
