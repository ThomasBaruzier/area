import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { Strategy } from "passport-spotify";

import { CustomLogger } from "../../logger/logger.service";

export interface SpotifyAuthUser {
  identity: string;
  email: string | null;
  firstName: string;
  accessToken: string;
  refreshToken: string;
}

interface SpotifyProfile {
  id: string;
  displayName?: string;
  emails?: Array<{ value: string }>;
}

@Injectable()
export class SpotifyStrategy extends PassportStrategy(Strategy, "spotify") {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomLogger,
  ) {
    const backendUrl = configService.getOrThrow<string>("BACKEND_URL");
    const proxyAuthUrl = configService.get<string>("OAUTH_PROXY_REDIRECT_URL");
    const proxyCallbackUrl = configService.get<string>(
      "OAUTH_PROXY_CALLBACK_URL",
    );

    super({
      clientID: configService.getOrThrow<string>("CLIENT_ID_SPOTIFY"),
      clientSecret: configService.getOrThrow<string>("CLIENT_SECRET_SPOTIFY"),
      callbackURL: proxyCallbackUrl || `${backendUrl}/auth/spotify/callback`,
      authorizationURL: proxyAuthUrl,
      scope: [
        "user-read-email",
        "user-read-private",
        "playlist-modify-public",
        "playlist-modify-private",
        "user-read-playback-state",
        "user-modify-playback-state",
        "user-read-currently-playing",
      ],
      passReqToCallback: true,
    });
    this.logger.setContext(SpotifyStrategy.name);
  }

  authorizationParams(options: object): object {
    const backendUrl = this.configService.getOrThrow<string>("BACKEND_URL");
    const developerCallbackUrl = `${backendUrl}/auth/spotify/callback`;

    return {
      ...options,
      access_type: "offline",
      prompt: "consent",
      auth_url: "https://accounts.spotify.com/authorize",
      developer_callback_url: developerCallbackUrl,
    };
  }

  validate(
    _req: Request,
    accessToken: string,
    refreshToken: string,
    profile: SpotifyProfile,
  ): Promise<SpotifyAuthUser> {
    const { id, displayName } = profile;
    const emails = (profile.emails ?? []) as Array<{ value: string }>;
    const email = emails.length > 0 ? emails[0].value : null;

    this.logger.log(
      `Validating Spotify profile for email: ${email ?? "unknown"}`,
    );
    return Promise.resolve({
      identity: id,
      email,
      firstName: displayName || "spotify_user",
      accessToken,
      refreshToken,
    });
  }
}
