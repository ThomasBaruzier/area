import { createContext } from "react";

import type { CreateWorkflowDto, Workflow } from "../types/workflow";

export type WorkflowsContextType = {
  workflows: Workflow[] | null;
  loading: boolean;
  error: string | null;
  createWorkflow: (payload: CreateWorkflowDto) => Promise<Workflow>;
  updateWorkflow: (
    id: string | number,
    payload: Partial<CreateWorkflowDto>,
  ) => Promise<Workflow>;
  deleteWorkflow: (id: string | number) => Promise<void>;
};

export const WorkflowsContext = createContext<WorkflowsContextType | undefined>(
  undefined,
);
