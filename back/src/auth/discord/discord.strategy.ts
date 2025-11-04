import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-discord";

import { CustomLogger } from "../../logger/logger.service";

export interface DiscordAuthUser {
  identity: string;
  email: string | null;
  firstName: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, "discord") {
  constructor(
    private configService: ConfigService,
    private readonly logger: CustomLogger,
  ) {
    const backendUrl = configService.getOrThrow<string>("BACKEND_URL");
    const proxyAuthUrl = configService.get<string>("OAUTH_PROXY_REDIRECT_URL");
    const proxyCallbackUrl = configService.get<string>(
      "OAUTH_PROXY_CALLBACK_URL",
    );

    super({
      clientID: configService.getOrThrow<string>("CLIENT_ID_DISCORD"),
      clientSecret: configService.getOrThrow<string>("CLIENT_SECRET_DISCORD"),
      callbackURL: proxyCallbackUrl || `${backendUrl}/auth/discord/callback`,
      authorizationURL: proxyAuthUrl,
      scope: ["identify", "email", "guilds", "bot"],
    });
    this.logger.setContext(DiscordStrategy.name);
  }

  authorizationParams(options: object): object {
    const backendUrl = this.configService.getOrThrow<string>("BACKEND_URL");
    const developerCallbackUrl = `${backendUrl}/auth/discord/callback`;

    return {
      ...options,
      auth_url: "https://discord.com/oauth2/authorize",
      developer_callback_url: developerCallbackUrl,
      permissions: 3072, // view channels + send messages
    };
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<DiscordAuthUser> {
    const { id, username, email } = profile;
    this.logger.debug(`Validating Discord profile for user: ${username}`);

    const user: DiscordAuthUser = {
      identity: id,
      email: email ?? null,
      firstName: profile.global_name || username,
      accessToken,
      refreshToken,
    };

    return Promise.resolve(user);
  }
}
