import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { TwitchStrategy } from "./twitch.strategy";

const TWITCH_SCOPES = [
  "user:read:email",
  "user:read:chat",
  "user:bot",
  "chat:read",
  "channel:bot",
  "clips:edit",
  "moderator:read:chat_messages",
  "channel:moderate",
].join(" ");

@Injectable()
export class CustomTwitchStrategy extends TwitchStrategy {
  redirect!: (url: string) => void;

  constructor(
    readonly logger: CustomLogger,
    readonly configService: ConfigService,
  ) {
    super(logger, configService);
  }

  authenticate(req: Request, options: { state: string }): void {
    if (req.query.code) {
      (
        super.authenticate as (req: Request, options: { state: string }) => void
      )(req, options);
      return;
    }

    const state = options.state;

    const proxyAuthUrl = this.configService.get<string>(
      "OAUTH_PROXY_REDIRECT_URL",
    );
    const backendUrl = this.configService.getOrThrow<string>("BACKEND_URL");
    const clientId = this.configService.getOrThrow<string>("CLIENT_ID_TWITCH");
    const developerCallbackUrl = `${backendUrl}/auth/twitch/callback`;

    let redirectUrl: string;

    if (proxyAuthUrl) {
      this.logger.debug(
        "Twitch auth: Using tunnel mode redirect via custom strategy.",
      );
      const params = new URLSearchParams({
        auth_url: "https://id.twitch.tv/oauth2/authorize",
        client_id: clientId,
        scope: TWITCH_SCOPES,
        developer_callback_url: developerCallbackUrl,
        state: state,
      });
      redirectUrl = `${proxyAuthUrl}?${params.toString()}`;
    } else {
      this.logger.debug(
        "Twitch auth: Using local mode redirect via custom strategy.",
      );
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: developerCallbackUrl,
        scope: TWITCH_SCOPES,
        state: state,
      });
      redirectUrl = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
    }

    this.logger.log(`Redirecting to: ${redirectUrl}`);
    this.redirect(redirectUrl);
  }
}
