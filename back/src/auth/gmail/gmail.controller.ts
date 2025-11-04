import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { gmail_v1 } from "googleapis";

import { CustomLogger } from "../../logger/logger.service";
import type { AuthenticatedRequest } from "../auth.type";
import { JwtAuthGuard } from "../jwt-auth.guard";
import type { GmailNotificationPayload } from "./gmail.service";
import { GmailService } from "./gmail.service";

interface PubSubMessage {
  data?: string;
  messageId: string;
  publishTime: string;
}

interface PubSubWebhook {
  message?: PubSubMessage;
  subscription: string;
}

@Controller("api/google")
export class GmailController {
  constructor(
    private readonly gmailService: GmailService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(GmailController.name);
  }

  @Post("webhook")
  async pushWebhook(
    @Body() body: PubSubWebhook,
    @Res() res: Response,
  ): Promise<void> {
    res.status(HttpStatus.NO_CONTENT).send();
    try {
      const message = body.message;
      if (!message || !message.data) {
        this.logger.debug("Gmail webhook ignored: no message data.");
        return;
      }
      const payload = JSON.parse(
        Buffer.from(message.data, "base64").toString("utf8"),
      ) as GmailNotificationPayload;
      this.logger.log(`Gmail webhook for ${payload.emailAddress}`);
      await this.gmailService.handleNotification(payload);
    } catch (err) {
      const message = err instanceof Error ? err.stack : String(err);
      this.logger.error("Error processing Gmail webhook", message);
    }
  }

  @Get("start-watch")
  @UseGuards(JwtAuthGuard)
  async startWatch(
    @Req() req: AuthenticatedRequest,
  ): Promise<gmail_v1.Schema$WatchResponse> {
    this.logger.log(`Starting watch for user ${req.user.id.toString()}`);
    return this.gmailService.startWatch(req.user);
  }
}
