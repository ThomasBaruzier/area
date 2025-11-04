import { Injectable, NotFoundException } from "@nestjs/common";
import { ServiceConnection } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ServiceConnectionService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateServiceConnection(data: {
    userId: number;
    serviceId: number;
    token: string;
    refreshToken?: string | null;
    expiresAt: Date;
    serviceUserIdentity: string;
  }): Promise<ServiceConnection> {
    const existingConnection = await this.prisma.serviceConnection.findFirst({
      where: {
        userId: data.userId,
        serviceId: data.serviceId,
      },
    });

    if (existingConnection) {
      return this.prisma.serviceConnection.update({
        where: { id: existingConnection.id },
        data: {
          token: data.token,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
          serviceUserIdentity: data.serviceUserIdentity,
        },
      });
    } else {
      return this.prisma.serviceConnection.create({
        data: {
          user: { connect: { id: data.userId } },
          service: { connect: { id: data.serviceId } },
          token: data.token,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
          serviceUserIdentity: data.serviceUserIdentity,
        },
      });
    }
  }

  async getServiceIdByName(name: string): Promise<number> {
    const service = await this.prisma.service.findUnique({
      where: { name },
      select: { id: true },
    });
    if (!service) {
      throw new NotFoundException(`Service '${name}' not found`);
    }
    return service.id;
  }
}
