import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { AuthService } from "../auth.service";
import { DecodedState, type DecodedStateDto } from "../decoded-state.decorator";
import { StatefulAuthGuard } from "../stateful-auth.guard";
import type { SpotifyAuthUser } from "./spotify.strategy";

export interface AuthenticatedSpotifyRequest extends Request {
  user: SpotifyAuthUser;
}

const SPOTIFY_TOKEN_EXPIRATION_MS = 8 * 60 * 60 * 1000;

@Controller("auth/spotify")
export class SpotifyController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(SpotifyController.name);
  }

  @Get()
  @UseGuards(StatefulAuthGuard("spotify"))
  async spotifyAuth(): Promise<void> {}

  @Get("callback")
  @UseGuards(AuthGuard("spotify"))
  async spotifyRedirect(
    @Req() req: AuthenticatedSpotifyRequest,
    @Res() res: Response,
    @DecodedState() state: DecodedStateDto,
  ): Promise<void> {
    this.logger.log("Handling Spotify OAuth callback.");

    if (!req.user.email) {
      this.logger.log(
        "Spotify OAuth failed: Email is null. User needs to make it public.",
      );
      res
        .status(400)
        .send("Email is required. Please make your Spotify email public.");
      return;
    }

    await this.authService.handleOAuthCallback(
      req.user,
      "spotify",
      SPOTIFY_TOKEN_EXPIRATION_MS,
      state,
      res,
    );
  }
}
