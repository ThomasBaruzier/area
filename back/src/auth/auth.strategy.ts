import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Role } from "@prisma/client";
import { ExtractJwt, Strategy } from "passport-jwt";

import { CustomLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";

interface JwtPayload {
  sub: number;
  username: string;
  email?: string;
  role?: string;
}

export interface ValidatedUser {
  id: number;
  username: string;
  email: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private readonly logger: CustomLogger,
  ) {
    const secret = config.get<string>("JWT_SECRET");
    if (!secret) {
      const errorMessage = "FATAL ERROR: JWT_SECRET is not defined in .env.";
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
    this.logger.setContext(JwtStrategy.name);
  }

  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    this.logger.debug(`Validating JWT for user ${payload.sub.toString()}`);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, email: true, role: true },
    });

    if (!user) {
      this.logger.warn(
        `JWT validation failed: user ${payload.sub.toString()} not found.`,
      );
      throw new UnauthorizedException("User no longer exists");
    }

    if (!user.email) {
      this.logger.warn(
        `JWT validation failed: user ${payload.sub.toString()} has no email.`,
      );
      throw new UnauthorizedException("User email is required");
    }

    this.logger.verbose(`JWT valid for user ${user.username}`);
    return user as ValidatedUser;
  }
}
