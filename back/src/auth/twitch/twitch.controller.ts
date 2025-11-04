import { Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { TriggerService } from "../../reactions/trigger.service";
import { AuthService } from "../auth.service";
import { DecodedState, type DecodedStateDto } from "../decoded-state.decorator";
import { StatefulAuthGuard } from "../stateful-auth.guard";
import type { TwitchAuthUser } from "./twitch.strategy";
import { TwitchWebhookGuard } from "./twitch-webhook.guard";

export interface AuthenticatedTwitchRequest extends Request {
  user: TwitchAuthUser;
}

@Controller("auth/twitch")
export class TwitchController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: CustomLogger,
    private readonly trigger: TriggerService,
  ) {}

  @Get()
  @UseGuards(StatefulAuthGuard("twitch"))
  async twitch(): Promise<void> {}

  @Get("callback")
  @UseGuards(AuthGuard("twitch"))
  async twitchCallback(
    @Res() res: Response,
    @Req() req: AuthenticatedTwitchRequest,
    @DecodedState() state: DecodedStateDto,
  ): Promise<void> {
    this.logger.log("Handling Twitch OAuth callback.");

    await this.authService.handleOAuthCallback(
      req.user,
      "twitch",
      100000,
      state,
      res,
    );
  }

  @Post("webhook")
  @UseGuards(TwitchWebhookGuard)
  async twitchWebhook(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const messageType = req.headers["twitch-eventsub-message-type"];

    if (messageType === "webhook_callback_verification") {
      const challenge = (req.body as { challenge: string }).challenge;
      this.logger.log(
        `Responding to Twitch webhook verification with challenge.`,
      );
      res.status(200).type("text/plain").send(challenge);
      return;
    }

    if (messageType === "notification") {
      const { subscription, event } = req.body as {
        subscription: { id: string; type: string };
        event: Record<string, unknown>;
      };
      const eventType = subscription.type;
      const subscriptionId = subscription.id;

      res.status(204).send();

      this.logger.log(`Received Twitch notification for event: ${eventType}`);

      const supportedEvents = [
        "user.update",
        "user.whisper.message",
        "stream.online",
        "stream.offline",
      ];

      if (supportedEvents.includes(eventType)) {
        const normalizedEvent = eventType.replaceAll(".", "_");
        this.logger.log(`Handling supported trigger event: ${eventType}`);
        await this.trigger.handleTrigger(
          "twitch",
          normalizedEvent,
          event,
          undefined,
          subscriptionId,
        );
      } else {
        this.logger.debug(`Ignoring unsupported Twitch event: ${eventType}`);
      }
      return;
    }

    res.status(204).send();
  }
}
