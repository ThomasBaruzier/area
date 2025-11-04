import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-twitch-strategy";

import { CustomLogger } from "../../logger/logger.service";

export interface TwitchAuthUser {
  identity: string;
  email: string | null;
  firstName: string;
  accessToken: string;
  refreshToken: string;
}

export interface ProfileTwitch {
  id: string;
  email: string | null;
  displayName: string;
}

@Injectable()
export class TwitchStrategy extends PassportStrategy(Strategy, "twitch") {
  constructor(
    protected readonly logger: CustomLogger,
    protected configService: ConfigService,
  ) {
    const backendUrl = configService.getOrThrow<string>("BACKEND_URL");
    const proxyAuthUrl = configService.get<string>("OAUTH_PROXY_REDIRECT_URL");
    const proxyCallbackUrl = configService.get<string>(
      "OAUTH_PROXY_CALLBACK_URL",
    );

    super({
      clientID: configService.getOrThrow<string>("CLIENT_ID_TWITCH"),
      clientSecret: configService.getOrThrow<string>("CLIENT_SECRET_TWITCH"),
      callbackURL: proxyCallbackUrl || `${backendUrl}/auth/twitch/callback`,
      authorizationURL: proxyAuthUrl,
      scope: [
        "user:read:email",
        "user:read:chat",
        "user:bot",
        "chat:read",
        "channel:bot",
        "clips:edit",
        "moderator:read:chat_messages",
        "channel:moderate",
      ],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: ProfileTwitch,
  ): Promise<TwitchAuthUser> {
    this.logger.debug(`Validating twitch strategy : ${profile.email ?? ""}`);
    const user: TwitchAuthUser = {
      identity: profile.id,
      email: profile.email ?? null,
      firstName: profile.displayName,
      accessToken,
      refreshToken,
    };
    return Promise.resolve(user);
  }
}
