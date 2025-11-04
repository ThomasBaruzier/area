import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { AuthService } from "../auth.service";
import { DecodedState, type DecodedStateDto } from "../decoded-state.decorator";
import { StatefulAuthGuard } from "../stateful-auth.guard";
import type { DiscordAuthUser } from "./discord.strategy";

export interface AuthenticatedDiscordRequest extends Request {
  user: DiscordAuthUser;
}

const DISCORD_TOKEN_EXPIRATION_MS = 604800 * 1000;

@Controller("auth/discord")
export class DiscordController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(DiscordController.name);
  }

  @Get()
  @UseGuards(StatefulAuthGuard("discord"))
  async discordAuth(): Promise<void> {}

  @Get("callback")
  @UseGuards(AuthGuard("discord"))
  async discordRedirect(
    @Req() req: AuthenticatedDiscordRequest,
    @Res() res: Response,
    @DecodedState() state: DecodedStateDto,
  ): Promise<void> {
    this.logger.log("Handling Discord OAuth callback.");

    await this.authService.handleOAuthCallback(
      req.user,
      "discord",
      DISCORD_TOKEN_EXPIRATION_MS,
      state,
      res,
    );
  }
}
