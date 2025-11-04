import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

export interface ActionInfo {
  id: number;
  name: string;
  description: string;
  jsonFormat: Prisma.JsonValue;
}

@Injectable()
export class ActionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActionByServiceId(serviceId: number): Promise<ActionInfo[]> {
    const actions = await this.prisma.action.findMany({
      where: { serviceId },
      select: {
        id: true,
        name: true,
        description: true,
        jsonFormat: true,
      },
    });

    return actions.map(({ id, name, description, jsonFormat }) => ({
      id,
      name,
      description,
      jsonFormat,
    }));
  }
}
