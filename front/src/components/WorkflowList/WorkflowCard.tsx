import "./WorkflowList.css";

import React from "react";
import { useNavigate } from "react-router-dom";

import type { Workflow } from "../../types/workflow";

type ResolvedWorkflow = Workflow & {
  actionName: string;
  reactionNames: string[];
};

type Props = {
  wf: ResolvedWorkflow;
  onDelete: (id: number | string) => void;
  onToggle: (id: number | string, next: boolean) => void;
};

function toPairs(body: unknown): Array<{ key: string; value: string }> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return [];
  }
  return Object.entries(body).map(([key, value]) => ({
    key,
    value: String(value ?? "—"),
  }));
}

export default function WorkflowCard({
  wf,
  onDelete,
  onToggle,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const isActive = wf.toggle ?? true;

  const actionName = wf.actionName;
  const reactionNames = wf.reactionNames;
  const actionBodyPairs = toPairs(wf.action.actionBody);

  return (
    <article
      className="card workflow-card"
      aria-label={`Workflow ${String(wf.id)}`}
      data-testid={`workflow-card-${String(wf.id)}`}
    >
      <header className="workflow-card-header">
        <div className="workflow-card-title">
          <h3 className="wf-title">{actionName}</h3>
          <span className={`wf-status ${isActive ? "on" : "off"}`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="wf-actions">
          <button
            type="button"
            className={`wf-btn wf-toggle ${isActive ? "on" : "off"}`}
            onClick={() => {
              onToggle(wf.id, !isActive);
            }}
            aria-pressed={isActive}
            title={isActive ? "Deactivate" : "Activate"}
            data-testid={`toggle-workflow-${String(wf.id)}`}
          >
            <span className="toggle-knob" />
            <span className="toggle-label">{isActive ? "On" : "Off"}</span>
          </button>

          <button
            type="button"
            className="wf-btn"
            onClick={() => {
              void navigate(`/workflow/edit/${String(wf.id)}`, {
                state: { wf },
              });
            }}
            title="Edit in canvas"
          >
            Edit
          </button>

          <button
            type="button"
            className="wf-btn danger"
            onClick={() => {
              onDelete(wf.id);
            }}
            title="Delete workflow"
            data-testid={`delete-workflow-${String(wf.id)}`}
          >
            Delete
          </button>
        </div>
      </header>

      <section className="workflow-card-body">
        <div className="wf-section">
          <div className="wf-section-head">
            <span className="wf-badge wf-action">Action</span>
          </div>
          <div className="kv-grid">
            {actionBodyPairs.length > 0 ? (
              actionBodyPairs.map(({ key, value }) => (
                <div key={key} className="kv-item">
                  <span className="kv-key">{key}</span>
                  <span className="kv-sep">:</span>
                  <span className="kv-val">{value}</span>
                </div>
              ))
            ) : (
              <div className="wf-empty">No fields</div>
            )}
          </div>
        </div>

        <div className="wf-section">
          <div className="wf-section-head">
            <span className="wf-badge wf-reaction">
              Reactions ({wf.reactions.length})
            </span>
          </div>

          {wf.reactions.length === 0 ? (
            <div className="wf-empty">No reactions</div>
          ) : (
            <div className="wf-reactions">
              {wf.reactions.map((r, idx) => {
                const bodyPairs = toPairs(r.reactionBody);
                return (
                  <div
                    key={`${String(r.reactionId)}-${String(idx)}`}
                    className="wf-reaction-item"
                  >
                    <div className="wf-meta">
                      <span className="wf-chip">
                        {reactionNames[idx] ||
                          `Reaction ${String(r.reactionId)}`}
                      </span>
                    </div>
                    <div className="kv-grid">
                      {bodyPairs.length > 0 ? (
                        bodyPairs.map(({ key, value }) => (
                          <div key={key} className="kv-item">
                            <span className="kv-key">{key}</span>
                            <span className="kv-sep">:</span>
                            <span className="kv-val">{value}</span>
                          </div>
                        ))
                      ) : (
                        <div className="wf-empty">No fields</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </article>
  );
}
