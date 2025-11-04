import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { IsEnum, IsOptional, IsString } from "class-validator";
import type { Request } from "express";

export enum AuthOrigin {
  WEB = "web",
  MOBILE = "mobile",
}

export class DecodedStateDto {
  @IsEnum(AuthOrigin)
  @IsOptional()
  origin: AuthOrigin = AuthOrigin.WEB;

  @IsString()
  @IsOptional()
  token?: string;
}

export const DecodedState = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DecodedStateDto => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const state = request.query.state as string;
    const result = new DecodedStateDto();

    if (!state) {
      return result;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(state, "base64").toString("utf8"),
      ) as { origin?: string; token?: string };
      if (decoded.origin === AuthOrigin.MOBILE) {
        result.origin = AuthOrigin.MOBILE;
      }
      if (decoded.token) {
        result.token = decoded.token;
      }
    } catch {
      /* ignore */
    }

    return result;
  },
);
