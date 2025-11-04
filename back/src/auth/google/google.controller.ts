import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { AuthService } from "../auth.service";
import { DecodedState, type DecodedStateDto } from "../decoded-state.decorator";
import { StatefulAuthGuard } from "../stateful-auth.guard";
import type { GoogleAuthUser } from "./google.strategy";

export interface AuthenticatedGoogleRequest extends Request {
  user: GoogleAuthUser;
}

const GOOGLE_TOKEN_EXPIRATION_MS = 3500 * 1000;

@Controller("auth/google")
export class GoogleController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(GoogleController.name);
  }

  @Get()
  @UseGuards(StatefulAuthGuard("google"))
  async googleAuth(): Promise<void> {}

  @Get("callback")
  @UseGuards(AuthGuard("google"))
  async googleAuthRedirect(
    @Req() req: AuthenticatedGoogleRequest,
    @Res() res: Response,
    @DecodedState() state: DecodedStateDto,
  ): Promise<void> {
    this.logger.log("Handling Google OAuth callback.");

    if (!req.user.email) {
      this.logger.warn("Google OAuth callback failed: email is null.");
      res.status(400).send("Email is required for authentication.");
      return;
    }

    await this.authService.handleOAuthCallback(
      req.user,
      "google",
      GOOGLE_TOKEN_EXPIRATION_MS,
      state,
      res,
    );
  }
}
