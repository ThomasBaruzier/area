import { Injectable } from "@nestjs/common";

import { PrismaService } from "./prisma/prisma.service";

export interface AboutResponse {
  client: {
    host: string;
  };
  server: {
    current_time: number;
    services: {
      name: string;
      actions: { name: string; description: string }[];
      reactions: { name: string; description: string }[];
    }[];
  };
}

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  async getAbout(clientHost: string): Promise<AboutResponse> {
    const services = await this.prisma.service.findMany({
      include: {
        actions: {
          select: {
            name: true,
            description: true,
          },
        },
        reactions: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    });

    return {
      client: {
        host: clientHost,
      },
      server: {
        current_time: Math.floor(Date.now() / 1000),
        services: services.map(({ name, actions, reactions }) => ({
          name,
          actions: actions.map(({ name, description }) => ({
            name,
            description,
          })),
          reactions: reactions.map(({ name, description }) => ({
            name,
            description,
          })),
        })),
      },
    };
  }
}
