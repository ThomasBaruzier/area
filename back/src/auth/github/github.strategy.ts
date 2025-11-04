import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-github";
import { firstValueFrom } from "rxjs";

import { CustomLogger } from "../../logger/logger.service";

export interface GithubAuthUser {
  identity: string;
  email: string | null;
  firstName: string;
  accessToken: string;
  refreshToken: string;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, "github") {
  constructor(
    private configService: ConfigService,
    private readonly logger: CustomLogger,
    private readonly httpService: HttpService,
  ) {
    const backendUrl = configService.getOrThrow<string>("BACKEND_URL");
    const proxyAuthUrl = configService.get<string>("OAUTH_PROXY_REDIRECT_URL");
    const proxyCallbackUrl = configService.get<string>(
      "OAUTH_PROXY_CALLBACK_URL",
    );

    super({
      clientID: configService.getOrThrow<string>("CLIENT_ID_GITHUB"),
      clientSecret: configService.getOrThrow<string>("CLIENT_SECRET_GITHUB"),
      callbackURL: proxyCallbackUrl || `${backendUrl}/auth/github/callback`,
      authorizationURL: proxyAuthUrl,
      scope: [
        "read:user",
        "user:email",
        "notifications",
        "admin:repo_hook",
        "repo",
      ],
    });
    this.logger.setContext(GithubStrategy.name);
  }

  authorizationParams(options: object): object {
    const backendUrl = this.configService.getOrThrow<string>("BACKEND_URL");
    const developerCallbackUrl = `${backendUrl}/auth/github/callback`;

    return {
      ...options,
      auth_url: "https://github.com/login/oauth/authorize",
      developer_callback_url: developerCallbackUrl,
    };
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<GithubAuthUser> {
    const usernameForLogs = profile.username ?? "N/A";
    this.logger.debug(`Validating GitHub profile for user: ${usernameForLogs}`);
    this.logger.verbose({
      message: "Received profile from GitHub",
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        emails: profile.emails,
      },
    });

    let email: string | null = null;

    try {
      const { data: emails } = await firstValueFrom(
        this.httpService.get<GithubEmail[]>(
          "https://api.github.com/user/emails",
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        ),
      );

      this.logger.debug(
        `Fetched emails from GitHub API for ${usernameForLogs}`,
      );
      this.logger.verbose({ message: "Email data from API", emails });

      const primaryEmail = emails.find((e) => e.primary && e.verified);
      email = primaryEmail ? primaryEmail.email : null;

      if (!email) {
        const firstVerified = emails.find((e) => e.verified);
        email = firstVerified ? firstVerified.email : null;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch emails from GitHub API for ${usernameForLogs}: ${message}`,
      );
    }

    const user: GithubAuthUser = {
      identity: profile.id,
      email: email,
      firstName: profile.displayName || profile.username || "github_user",
      accessToken,
      refreshToken,
    };

    this.logger.debug(
      `Extracted user info for validation: email=${user.email ?? "null"}, name=${
        user.firstName
      }`,
    );
    return user;
  }
}
