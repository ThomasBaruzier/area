import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Service } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

type ServiceInfo = Pick<Service, "id" | "name" | "description"> & {
  connectUrl: string;
};

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getServices(): Promise<ServiceInfo[]> {
    const services = await this.prisma.service.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    const backendUrl = this.configService.getOrThrow<string>("BACKEND_URL");

    return services.map((service) => ({
      ...service,
      connectUrl: `${backendUrl}/auth/${service.name.toLowerCase()}`,
    }));
  }
}
