export type WorkflowAction = {
  serviceId: number;
  actionId: number;
  actionBody: unknown;
};

export type Service = {
  id: number;
  name: string;
  color?: string;
  description?: string;
  connectUrl: string;
};

export type ActionOrReaction = {
  id: number;
  name: string;
  description: string;
  jsonFormat?: Record<string, unknown>;
  type: "action" | "reaction";
};

export type WorkflowReaction = {
  serviceId: number;
  reactionId: number;
  reactionBody: unknown;
};

export type Workflow = {
  id: number | string;
  toggle?: boolean | null;
  action: WorkflowAction;
  reactions: WorkflowReaction[];
};

export type WorkflowListResponse = {
  Workflows: Workflow[];
};

export type NodeType = "action" | "reaction";

export type NodeData = {
  serviceId: number;
  serviceName: string;
  serviceColor?: string;
  item: ActionOrReaction;
  values?: Record<string, string>;
  onOpenEditor?: (id: string) => void;
};

type JsonData = Record<string, unknown>;

export type CreateWorkflowDto = {
  toggle?: boolean;
  action: { serviceId: number; actionId: number; actionBody?: JsonData };
  reactions: Array<{
    serviceId: number;
    reactionId: number;
    reactionBody?: JsonData;
  }>;
};
