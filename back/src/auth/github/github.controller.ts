import { Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { TriggerService } from "../../reactions/trigger.service";
import { AuthService } from "../auth.service";
import { DecodedState, type DecodedStateDto } from "../decoded-state.decorator";
import { StatefulAuthGuard } from "../stateful-auth.guard";
import type { GithubAuthUser } from "./github.strategy";
import { GithubWebhookGuard } from "./github-webhook.guard";

export interface AuthenticatedGithubRequest extends Request {
  user: GithubAuthUser;
}

const GITHUB_TOKEN_EXPIRATION_MS = 8 * 60 * 60 * 1000;

@Controller("auth/github")
export class GithubController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: CustomLogger,
    private readonly trigger: TriggerService,
  ) {
    this.logger.setContext(GithubController.name);
  }

  @Get()
  @UseGuards(StatefulAuthGuard("github"))
  async githubAuth(): Promise<void> {}

  @Post("webhooks")
  @UseGuards(GithubWebhookGuard)
  async githubWebHooks(@Req() req: Request): Promise<void> {
    const event = req.headers["x-github-event"] as string;
    const deliveryId = req.headers["x-github-delivery"] as string;

    this.logger.log(
      `Received GitHub webhook. Event: ${event}, Delivery ID: ${deliveryId}`,
    );

    const supportedEvents = [
      "push",
      "pull_request",
      "release",
      "commit_comment",
      "issues",
    ];

    const senderId = (req.body as { sender?: { id?: number } }).sender?.id;
    const serviceUserIdentity = senderId ? String(senderId) : undefined;

    if (supportedEvents.includes(event)) {
      this.logger.log(`Handling supported trigger event: ${event}`);
      await this.trigger.handleTrigger(
        "github",
        event,
        req.body as Record<string, unknown>,
        serviceUserIdentity,
      );
    } else {
      this.logger.debug(`Ignoring unsupported GitHub event: ${event}`);
    }
  }

  @Get("callback")
  @UseGuards(AuthGuard("github"))
  async githubRedirect(
    @Req() req: AuthenticatedGithubRequest,
    @Res() res: Response,
    @DecodedState() state: DecodedStateDto,
  ): Promise<void> {
    this.logger.log("Handling GitHub OAuth callback.");

    if (!req.user.email) {
      this.logger.warn(
        "GitHub OAuth callback is missing email. Linking to existing user if session token is present.",
      );
    }
    await this.authService.handleOAuthCallback(
      req.user,
      "github",
      GITHUB_TOKEN_EXPIRATION_MS,
      state,
      res,
    );
  }
}
