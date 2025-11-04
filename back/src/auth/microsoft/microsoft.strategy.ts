import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-microsoft";
import { CustomLogger } from "src/logger/logger.service";

import { OAuthUser } from "../auth.service";

interface MicrosoftProfile {
  id: string;
  displayName: string;
  emails?: { value: string }[];
}

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, "microsoft") {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomLogger,
  ) {
    const backendUrl = configService.getOrThrow<string>("BACKEND_URL");
    const proxyAuthUrl = configService.get<string>("OAUTH_PROXY_REDIRECT_URL");
    const proxyCallbackUrl = configService.get<string>(
      "OAUTH_PROXY_CALLBACK_URL",
    );

    const strategyOptions = {
      clientID: configService.getOrThrow<string>("CLIENT_ID_MICROSOFT"),
      clientSecret: configService.getOrThrow<string>("CLIENT_SECRET_MICROSOFT"),
      callbackURL: proxyCallbackUrl || `${backendUrl}/auth/microsoft/callback`,
      authorizationURL:
        proxyAuthUrl ||
        `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`,
      tokenURL: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      scope: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "User.Read",
        "Mail.Read",
        "Mail.ReadWrite",
        "Mail.Send",
      ],
    };

    super(strategyOptions);
    this.logger.setContext(MicrosoftStrategy.name);
  }

  authorizationParams(
    options: Record<string, unknown>,
  ): Record<string, string> {
    const backendUrl = this.configService.getOrThrow<string>("BACKEND_URL");
    const developerCallbackUrl = `${backendUrl}/auth/microsoft/callback`;

    const params = {
      ...options,
      prompt: "select_account",
      auth_url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`,
      developer_callback_url: developerCallbackUrl,
    };

    this.logger.debug({
      message: "Generated Microsoft authorization parameters for proxy",
      params: {
        ...params,
        state: "[REDACTED]",
      },
    });

    return params;
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: MicrosoftProfile,
  ): Promise<OAuthUser> {
    const email = profile.emails?.[0]?.value ?? "N/A";
    this.logger.debug(`Validating Microsoft profile for user: ${email}`);
    this.logger.verbose({
      message: "Received profile from Microsoft",
      profile: {
        displayName: profile.displayName,
        email: email,
      },
    });
    return Promise.resolve({
      identity: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      firstName: profile.displayName,
      accessToken,
      refreshToken,
    });
  }
}
