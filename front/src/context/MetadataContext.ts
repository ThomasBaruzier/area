import { createContext } from "react";

import type { ActionOrReaction, Service } from "../types/workflow";

export type MetadataContextType = {
  services: Service[];
  loading: boolean;
  error: string | null;
  getService: (id: number | string) => Service | undefined;
  getActions: (serviceId: number | string) => Promise<ActionOrReaction[]>;
  getReactions: (serviceId: number | string) => Promise<ActionOrReaction[]>;
  getActionName: (serviceId: number, actionId: number) => string;
  getReactionName: (serviceId: number, reactionId: number) => string;
};

export const MetadataContext = createContext<MetadataContextType | undefined>(
  undefined,
);
