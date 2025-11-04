import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { type Profile, Strategy } from "passport-google-oauth20";

import { CustomLogger } from "../../logger/logger.service";

export interface GoogleAuthUser {
  identity: string;
  email: string | null;
  firstName: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
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
      clientID: configService.getOrThrow<string>("CLIENT_ID_GOOGLE"),
      clientSecret: configService.getOrThrow<string>("CLIENT_SECRET_GOOGLE"),
      callbackURL: proxyCallbackUrl || `${backendUrl}/auth/google/callback`,
      authorizationURL: proxyAuthUrl,
      scope: [
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
      ],
      passReqToCallback: true,
    });
    this.logger.setContext(GoogleStrategy.name);
  }

  authorizationParams(options: object): object {
    const backendUrl = this.configService.getOrThrow<string>("BACKEND_URL");
    const developerCallbackUrl = `${backendUrl}/auth/google/callback`;

    return {
      ...options,
      access_type: "offline",
      prompt: "consent",
      auth_url: "https://accounts.google.com/o/oauth2/v2/auth",
      developer_callback_url: developerCallbackUrl,
    };
  }

  validate(
    _req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<GoogleAuthUser> {
    const { name, emails } = profile;
    const email = emails?.[0]?.value;

    this.logger.debug(`Validating Google profile for email: ${email ?? "N/A"}`);
    this.logger.verbose({
      message: "Received profile from Google",
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        email,
      },
    });

    if (!email) {
      this.logger.warn(
        "Google profile validation: email is null, proceeding without email.",
      );
    }

    const user: GoogleAuthUser = {
      identity: email || profile.id,
      email: email || null,
      firstName: name?.givenName || "google_user",
      accessToken,
      refreshToken,
    };

    this.logger.debug(
      `Extracted user info for validation: identity=${user.identity}, name=${
        user.firstName
      }`,
    );
    return Promise.resolve(user);
  }
}
