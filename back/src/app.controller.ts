import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";

import type { AboutResponse } from "./app.service";
import { AppService } from "./app.service";
import { CustomLogger } from "./logger/logger.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(AppController.name);
  }

  @Get("about.json")
  getAbout(@Req() req: Request): Promise<AboutResponse> {
    const clientHost = req.ip || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "";

    if (!userAgent.toLowerCase().includes("wget")) {
      this.logger.log(`Serving about.json to ${clientHost}`);
    }

    return this.appService.getAbout(clientHost);
  }
}
