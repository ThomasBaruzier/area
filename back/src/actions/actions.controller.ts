import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";

import type { ActionInfo } from "./actions.service";
import { ActionsService } from "./actions.service";

@Controller("api/actions")
export class ActionsController {
  constructor(private readonly actionService: ActionsService) {}

  @Get(":serviceId")
  async getActions(
    @Param("serviceId", ParseIntPipe) serviceId: number,
  ): Promise<ActionInfo[]> {
    return this.actionService.getActionByServiceId(serviceId);
  }
}
