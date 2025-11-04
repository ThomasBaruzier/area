import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import type { Response } from "express";

import { CustomLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthOrigin, type DecodedStateDto } from "./decoded-state.decorator";
import { ServiceConnectionService } from "./serviceConnection.service";

export interface OAuthUser {
  identity: string;
  email: string | null;
  firstName: string;
  accessToken: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly serviceConnectionService: ServiceConnectionService,
    private readonly configService: ConfigService,
    private readonly logger: CustomLogger,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async handleOAuthCallback(
    oauthUser: OAuthUser,
    serviceName:
      | "google"
      | "github"
      | "twitch"
      | "spotify"
      | "discord"
      | "microsoft",
    expiresInMs: number,
    state: DecodedStateDto,
    res: Response,
  ): Promise<void> {
    this.logger.log(`Processing ${serviceName} OAuth callback.`);
    let user: User;

    if (state.token) {
      this.logger.log(
        "Found token in state. Linking service to authenticated user.",
      );
      try {
        const payload = await this.jwtService.verifyAsync<{ sub: number }>(
          state.token,
        );
        const userFromToken = await this.prisma.user.findUnique({
          where: { id: payload.sub },
        });

        if (!userFromToken) {
          this.logger.error(
            `User ${payload.sub.toString()} from token not found.`,
          );
          const frontendUrl =
            this.configService.getOrThrow<string>("FRONTEND_URL");
          res.redirect(`${frontendUrl}/login?error=user-not-found`);
          return;
        }
        user = userFromToken;
        this.logger.log(
          `Successfully identified user ${user.id.toString()}. Linking ${serviceName} account.`,
        );
      } catch (e) {
        this.logger.error(
          "Invalid token in OAuth state.",
          e instanceof Error ? e.stack : String(e),
        );
        const frontendUrl =
          this.configService.getOrThrow<string>("FRONTEND_URL");
        res.redirect(`${frontendUrl}/login?error=invalid-token`);
        return;
      }
    } else {
      if (!oauthUser.email) {
        this.logger.error(
          `OAuth failed for ${serviceName}: email is null. Cannot create or find user.`,
        );
        const frontendUrl =
          this.configService.getOrThrow<string>("FRONTEND_URL");
        res.redirect(`${frontendUrl}/login?error=email-required`);
        return;
      }
      this.logger.log(
        `No token in state. Processing OAuth for ${oauthUser.email}.`,
      );
      user = await this.getOrCreateUserFromOAuth(oauthUser);
    }

    const serviceId =
      await this.serviceConnectionService.getServiceIdByName(serviceName);

    await this.serviceConnectionService.createOrUpdateServiceConnection({
      userId: user.id,
      serviceId: serviceId,
      token: oauthUser.accessToken,
      refreshToken: oauthUser.refreshToken,
      expiresAt: new Date(Date.now() + expiresInMs),
      serviceUserIdentity: oauthUser.identity,
    });
    this.logger.log(
      `${serviceName} connection saved for user ${user.id.toString()}`,
    );

    const jwtToken = await this.createToken(user);

    if (state.origin === AuthOrigin.MOBILE) {
      const mobileRedirectUrl = `area-app://oauth-callback?token=${jwtToken.access_token}`;
      this.logger.log(`Redirecting to mobile: ${mobileRedirectUrl}`);
      res.redirect(mobileRedirectUrl);
    } else {
      const frontendUrl = this.configService.getOrThrow<string>("FRONTEND_URL");
      const finalRedirectUrl = `${frontendUrl}/oauth-callback?token=${jwtToken.access_token}`;
      this.logger.log(`Redirecting to web: ${finalRedirectUrl}`);
      res.redirect(finalRedirectUrl);
    }
  }

  async createToken(user: {
    id: number;
    username: string;
    email?: string;
    role?: string;
  }): Promise<{ access_token: string }> {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    this.logger.debug(`Creating JWT for user ${user.id.toString()}`);
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      access_token: accessToken,
    };
  }

  async getOrCreateUserFromOAuth(oauthUser: OAuthUser): Promise<User> {
    const { email, firstName } = oauthUser;
    if (!email) {
      this.logger.error("OAuth user creation failed: email is null.");
      throw new BadRequestException(
        "Email is required for OAuth user creation",
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.log(
        `Found OAuth user ${email} (ID: ${existingUser.id.toString()})`,
      );
      return existingUser;
    } else {
      this.logger.log(`New OAuth user: ${email}. Creating.`);
      try {
        const newUser = await this.prisma.user.create({
          data: {
            email,
            username: firstName,
            password: null,
            role: "USER",
          },
        });
        this.logger.log(`Created OAuth user with ID ${newUser.id.toString()}`);
        return newUser;
      } catch (error: unknown) {
        this.logger.error(
          `Failed to create user from OAuth data for email ${email}`,
          error instanceof Error ? error.stack : String(error),
        );
        throw new BadRequestException("Failed to create user from OAuth data");
      }
    }
  }
}
