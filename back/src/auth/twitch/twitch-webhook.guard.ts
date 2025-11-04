import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { Request } from "express";
import { CustomLogger } from "src/logger/logger.service";

@Injectable()
export class TwitchWebhookGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(TwitchWebhookGuard.name);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { rawBody: Buffer }>();

    const twitchMessageId = request.headers[
      "twitch-eventsub-message-id"
    ] as string;
    const twitchTimestamp = request.headers[
      "twitch-eventsub-message-timestamp"
    ] as string;
    const twitchSignature = request.headers[
      "twitch-eventsub-message-signature"
    ] as string;

    if (!twitchMessageId || !twitchTimestamp || !twitchSignature) {
      this.logger.warn("Webhook rejected: Missing Twitch EventSub headers.");
      throw new BadRequestException("Missing Twitch EventSub headers.");
    }

    const secret = this.configService.get<string>("CLIENT_SECRET_TWITCH");
    if (!secret) {
      this.logger.error(
        "Twitch webhook secret is not configured on the server.",
      );
      throw new BadRequestException("Webhook secret not configured.");
    }

    const message =
      twitchMessageId + twitchTimestamp + request.rawBody.toString("utf8");

    const hmac = crypto
      .createHmac("sha256", secret)
      .update(message)
      .digest("hex");

    const expectedSignature = `sha256=${hmac}`;

    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(twitchSignature);

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      this.logger.warn("Webhook rejected: Invalid Twitch signature.");
      throw new BadRequestException("Invalid Twitch signature.");
    }

    this.logger.debug("Twitch webhook signature validated successfully.");
    return true;
  }
}
