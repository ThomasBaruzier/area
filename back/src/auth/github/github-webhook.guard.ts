import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import type { Request } from "express";

import { CustomLogger } from "../../logger/logger.service";

@Injectable()
export class GithubWebhookGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(GithubWebhookGuard.name);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { rawBody: Buffer }>();
    const signature = request.headers["x-hub-signature-256"];

    if (!signature) {
      this.logger.warn(
        "Webhook request rejected: Missing X-Hub-Signature-256 header.",
      );
      throw new BadRequestException("Missing X-Hub-Signature-256 header");
    }

    const secret = this.configService.get<string>("GITHUB_WEBHOOK_SECRET");
    if (!secret) {
      this.logger.error("Webhook secret is not configured on the server.");
      throw new BadRequestException("Webhook secret is not configured.");
    }

    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(request.rawBody).digest("hex");

    const digestBuffer = Buffer.from(digest);
    const signatureBuffer = Buffer.from(signature as string);

    if (
      digestBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(digestBuffer, signatureBuffer)
    ) {
      this.logger.warn("Webhook request rejected: Invalid signature.");
      throw new BadRequestException("Invalid signature.");
    }

    this.logger.debug("Webhook signature validated successfully.");
    return true;
  }
}
