import "./WorkflowList.css";

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useMetadata } from "../../context/useMetadata";
import { useWorkflows } from "../../context/useWorkflows";
import type { Workflow } from "../../types/workflow";
import WorkflowCard from "./WorkflowCard";

type ResolvedWorkflow = Workflow & {
  actionName: string;
  reactionNames: string[];
};

export default function WorkflowListView(): JSX.Element {
  const {
    workflows,
    loading: workflowsLoading,
    error: workflowsError,
    deleteWorkflow,
    updateWorkflow,
  } = useWorkflows();
  const {
    getActionName,
    getReactionName,
    loading: metadataLoading,
    error: metadataError,
  } = useMetadata();
  const navigate = useNavigate();

  const resolvedWorkflows = useMemo((): ResolvedWorkflow[] | null => {
    if (!workflows) return null;
    return workflows.map((wf) => ({
      ...wf,
      actionName: getActionName(wf.action.serviceId, wf.action.actionId),
      reactionNames: wf.reactions.map((r) =>
        getReactionName(r.serviceId, r.reactionId),
      ),
    }));
  }, [workflows, getActionName, getReactionName]);

  const handleDelete = async (id: number | string): Promise<void> => {
    if (!window.confirm(`Delete workflow #${String(id)} ?`)) return;
    await deleteWorkflow(id);
  };

  const handleToggle = async (
    id: number | string,
    next: boolean,
  ): Promise<void> => {
    await updateWorkflow(id, { toggle: next });
  };

  const isLoading = workflowsLoading || metadataLoading;
  const error = workflowsError || metadataError;

  return (
    <section className="workflow-list">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: "var(--space-4)",
        }}
      >
        <h1 style={{ margin: 0 }}>Workflows</h1>
        <button
          type="button"
          className="wf-btn"
          onClick={() => {
            void navigate("/workflow/create");
          }}
          data-testid="create-workflow-button"
        >
          Create workflow
        </button>
      </div>

      {isLoading && (
        <div role="status" aria-live="polite">
          <div className="wf-skeleton" />
          <div className="wf-skeleton" />
          <div className="wf-skeleton" />
        </div>
      )}
      {!isLoading && error && <div className="error-box">{error}</div>}
      {!isLoading &&
        !error &&
        resolvedWorkflows &&
        resolvedWorkflows.length === 0 && (
          <div className="card">No workflows yet.</div>
        )}
      {!isLoading &&
        !error &&
        resolvedWorkflows &&
        resolvedWorkflows.length > 0 && (
          <>
            {resolvedWorkflows.map((wf) => (
              <WorkflowCard
                key={String(wf.id)}
                wf={wf}
                onDelete={() => {
                  void handleDelete(wf.id);
                }}
                onToggle={(id, next) => {
                  void handleToggle(id, next);
                }}
              />
            ))}
          </>
        )}
    </section>
  );
}
