import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { AuthService, OAuthUser } from "../auth.service";
import { DecodedState, DecodedStateDto } from "../decoded-state.decorator";
import { StatefulAuthGuard } from "../stateful-auth.guard";
import { MicrosoftService } from "./microsoft.service";
import { MicrosoftGraphNotificationBody } from "./microsoft.types";

const MICROSOFT_TOKEN_EXPIRATION_MS = 8 * 60 * 60 * 1000;

@Controller("auth/microsoft")
export class MicrosoftController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: CustomLogger,
    private readonly microsoftService: MicrosoftService,
  ) {
    this.logger.setContext(MicrosoftController.name);
  }

  @Get()
  @UseGuards(StatefulAuthGuard("microsoft"))
  async microsoftAuth(): Promise<void> {}

  @Get("callback")
  @UseGuards(AuthGuard("microsoft"))
  async microsoftCallback(
    @Req() req: Request & { user: OAuthUser },
    @Res() res: Response,
    @DecodedState() state: DecodedStateDto,
  ): Promise<void> {
    this.logger.log("Handling Microsoft OAuth callback.");
    this.logger.debug({
      message: "Received data from Microsoft strategy",
      user: req.user,
      state: state,
    });
    await this.authService.handleOAuthCallback(
      req.user,
      "microsoft",
      MICROSOFT_TOKEN_EXPIRATION_MS,
      state,
      res,
    );
  }

  @Post("outlook")
  async outlookactions(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: MicrosoftGraphNotificationBody,
  ): Promise<Response> {
    return this.microsoftService.mailReceived(req, res, body);
  }
}
