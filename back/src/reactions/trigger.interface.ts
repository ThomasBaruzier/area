import type { Prisma } from "@prisma/client";

export interface ActionConfig {
  owner?: string;
  repo?: string;
  branch?: string;
  label?: string;
  prAction?: string;
  from?: string;
  subject?: string;
}

export interface ReactionData extends Prisma.JsonObject {
  id: number;
}
