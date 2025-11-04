import type { ReactNode } from "react";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/useAuth";
import type { CreateWorkflowDto, Workflow } from "../types/workflow";
import apiFetch, { ApiError } from "../utils/fetchApi";
import { WorkflowsContext } from "./WorkflowsContext";

export function WorkflowsProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { isAuthenticated } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      setWorkflows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Workflow[] | null>("/api/workflow/list");
      setWorkflows(data || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load workflows.",
      );
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchWorkflows();
  }, [fetchWorkflows]);

  const createWorkflow = useCallback(
    async (payload: CreateWorkflowDto): Promise<Workflow> => {
      const newWorkflow = await apiFetch<Workflow>("/api/workflow/create", {
        method: "POST",
        body: payload,
      });
      setWorkflows((prev) => [...(prev || []), newWorkflow]);
      return newWorkflow;
    },
    [],
  );

  const updateWorkflow = useCallback(
    async (
      id: string | number,
      payload: Partial<CreateWorkflowDto>,
    ): Promise<Workflow> => {
      const updatedWorkflow = await apiFetch<Workflow>(
        `/api/workflow/edit/${String(id)}`,
        {
          method: "PATCH",
          body: payload,
        },
      );
      setWorkflows((prev) =>
        prev
          ? prev.map((wf) =>
              String(wf.id) === String(id) ? updatedWorkflow : wf,
            )
          : null,
      );
      return updatedWorkflow;
    },
    [],
  );

  const deleteWorkflow = useCallback(
    async (id: string | number): Promise<void> => {
      try {
        await apiFetch(`/api/workflow/delete/${String(id)}`, {
          method: "DELETE",
        });
        setWorkflows(
          (prev) => prev?.filter((wf) => String(wf.id) !== String(id)) ?? null,
        );
      } catch (e: unknown) {
        if (e instanceof ApiError && e.status === 404) {
          setWorkflows(
            (prev) =>
              prev?.filter((wf) => String(wf.id) !== String(id)) ?? null,
          );
        } else {
          throw e;
        }
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      workflows,
      loading,
      error,
      createWorkflow,
      updateWorkflow,
      deleteWorkflow,
    }),
    [workflows, loading, error, createWorkflow, updateWorkflow, deleteWorkflow],
  );

  return (
    <WorkflowsContext.Provider value={value}>
      {children}
    </WorkflowsContext.Provider>
  );
}
