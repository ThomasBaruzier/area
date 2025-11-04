import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { Reaction } from "@prisma/client";

import { TriggerService } from "./trigger.service";

type ReactionInfo = Pick<
  Reaction,
  "id" | "name" | "description" | "jsonFormat"
>;

@Controller("api/reactions")
export class ReactionsController {
  constructor(private readonly triggerService: TriggerService) {}

  @Get(":serviceId")
  async getReactions(
    @Param("serviceId", ParseIntPipe) serviceId: number,
  ): Promise<ReactionInfo[]> {
    return this.triggerService.getReactionsByServiceId(serviceId);
  }
}
