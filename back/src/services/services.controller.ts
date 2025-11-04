import { Controller, Get } from "@nestjs/common";
import { Service } from "@prisma/client";

import { ServicesService } from "./services.service";

type ServiceInfo = Pick<Service, "id" | "name" | "description"> & {
  connectUrl: string;
};

@Controller("api/services")
export class ServicesController {
  constructor(private readonly serviceService: ServicesService) {}

  @Get()
  async getServices(): Promise<ServiceInfo[]> {
    return this.serviceService.getServices();
  }
}
