import { useContext } from "react";

import {
  WorkflowsContext,
  type WorkflowsContextType,
} from "./WorkflowsContext";

export function useWorkflows(): WorkflowsContextType {
  const context = useContext(WorkflowsContext);
  if (context === undefined) {
    throw new Error("useWorkflows must be used within a WorkflowsProvider");
  }
  return context;
}
