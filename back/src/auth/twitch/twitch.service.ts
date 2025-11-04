import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { firstValueFrom } from "rxjs";

import { CustomLogger } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SendChatReactionDto } from "../../reactions/dto/reaction-data.dto";
import { ValidatedUser } from "../auth.strategy";

@Injectable()
export class TwitchService {
  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private readonly logger: CustomLogger,
  ) {}
  async getTwitchUserData(
    userName: string,
    headers: Record<string, string>,
  ): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: { id: string }[] }>(
          `https://api.twitch.tv/helix/users?login=${userName}`,
          { headers },
        ),
      );
      const user = response.data.data[0]?.id;
      if (!user) {
        this.logger.error(`User twitch not found: ${userName}`);
        return null;
      }
      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error during get Id user twitch "${userName}": ${message}`,
      );
      return null;
    }
  }

  async checkTwitch(user: ValidatedUser, workflowId: number): Promise<void> {
    const workflow = await this.prisma.workflow.findUnique({
      where: {
        id: workflowId,
        userId: user.id,
        action: {
          service: {
            name: "twitch",
          },
        },
      },
      include: { action: true },
    });
    if (!workflow) {
      this.logger.debug(
        `User ${user.id.toString()} has no Twitch workflows, skipping webhook setup.`,
      );
      return;
    }
    const twitchConnection = await this.prisma.serviceConnection.findFirst({
      where: { userId: user.id, service: { name: "twitch" } },
    });
    if (!twitchConnection?.token) {
      this.logger.warn(
        `No twitch token for user ${user.id.toString()}, cannot set up webhooks.`,
      );
      return;
    }
    const actionConfig = workflow.actionJson as Prisma.JsonObject;
    try {
      await this.makeWebhook(
        actionConfig,
        workflow.action.name,
        workflow.id,
        twitchConnection.token,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error during webhook creation Twitch ${message}`);
    }
  }

  private getWebhookUrl(): string {
    const proxyUrl = this.configService.get<string>("WEBHOOK_PROXY_URL");
    const backendUrl = this.configService.getOrThrow<string>("BACKEND_URL");
    const baseUrl = proxyUrl || backendUrl;
    return `${baseUrl}/auth/twitch/webhook`;
  }

  async makeWebhook(
    actionJson: Prisma.JsonObject,
    action: string,
    workflowId: number,
    userAccessToken: string,
  ): Promise<void> {
    const getHooksUrl = "https://api.twitch.tv/helix/eventsub/subscriptions";
    const callbackUrl = this.getWebhookUrl();
    const appAccessToken =
      this.configService.getOrThrow<string>("TOKEN_TWITCH");
    const clientId = this.configService.getOrThrow<string>("CLIENT_ID_TWITCH");
    const appAuthHeaders = {
      Authorization: `Bearer ${appAccessToken}`,
      "Client-Id": clientId,
      "Content-Type": "application/json",
    };
    let userId = "";
    let type = "";
    let version = "";
    let condition: Record<string, string> = {};
    const secret: string = this.configService.getOrThrow<string>(
      "CLIENT_SECRET_TWITCH",
    );

    const fail = (reason: string): never => {
      this.logger.error(
        `Failed to create Twitch webhook for workflow ${workflowId.toString()} for type ${type}: ${reason}`,
      );
      throw new Error(reason);
    };

    const getUserAuthHeaders = (token: string) => ({
      Authorization: `Bearer ${token}`,
      "Client-Id": clientId,
      "Content-Type": "application/json",
    });

    const getUserIdFromToken = async (token: string): Promise<string> => {
      try {
        const response = await firstValueFrom(
          this.httpService.get<{ data: { id: string }[] }>(
            `https://api.twitch.tv/helix/users`,
            { headers: getUserAuthHeaders(token) },
          ),
        );
        const id = response.data.data[0]?.id;
        if (!id) {
          return fail(
            "Could not determine user ID from the user access token.",
          );
        }
        return id;
      } catch (e) {
        this.logger.error(
          `Failed to get user ID from Twitch token: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
        return fail("Failed to get user ID from Twitch token.");
      }
    };

    if (action === "stream_online" || action === "stream_offline") {
      type = action === "stream_online" ? "stream.online" : "stream.offline";
      version = "1";
      const streamerName = actionJson.streamerName as string;
      if (!streamerName) fail("Streamer name is missing for this action.");
      userId =
        (await this.getTwitchUserData(streamerName, appAuthHeaders)) ?? "";
      if (!userId) fail("Could not get user data for webhook");
      condition = { broadcaster_user_id: userId };
    } else if (action === "user_update" || action === "user_whisper_message") {
      type = action === "user_update" ? "user.update" : "user.whisper.message";
      version = "1";
      userId = await getUserIdFromToken(userAccessToken);
      condition = { user_id: userId };
    }

    const payload = {
      type: type,
      version: version,
      condition: condition,
      transport: {
        method: "webhook",
        callback: callbackUrl,
        secret: secret,
      },
    };

    this.logger.log(
      `Creating Twitch webhook for workflow ${workflowId.toString()} for event type ${type}.`,
    );
    this.logger.verbose({
      message: "Webhook creation payload",
      url: getHooksUrl,
      payload: payload,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ data: { id: string }[] }>(
          getHooksUrl,
          payload,
          { headers: appAuthHeaders },
        ),
      );
      const subscriptionId = response.data.data[0].id;
      await this.prisma.workflow.update({
        where: { id: workflowId },
        data: { identifier: subscriptionId },
      });
      this.logger.log(
        `Successfully created Twitch webhook for workflow ${workflowId.toString()} for type ${type}.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create Twitch webhook for workflow ${workflowId.toString()} for type ${type}.`,
      );
      throw error;
    }
  }

  async sendMessageTwitchReaction(
    userId: number,
    payload: Record<string, unknown>,
    reactionData: Prisma.JsonValue,
  ): Promise<void> {
    const reactionDto = plainToInstance(SendChatReactionDto, reactionData);
    const errors = await validate(reactionDto);
    const tokenTwitch = this.configService.getOrThrow<string>("TOKEN_TWITCH");
    const headers = {
      Authorization: `Bearer ${tokenTwitch}`,
      "Client-Id": this.configService.getOrThrow<string>("CLIENT_ID_TWITCH"),
      "Content-Type": "application/json",
    };
    if (errors.length > 0) {
      this.logger.warn(
        `Invalid create_issue reaction data for user ${userId.toString()}: ${errors.toString()}`,
      );
      return;
    }
    const { message, userName, streamerName } = reactionDto;
    const broadcastId =
      (await this.getTwitchUserData(streamerName, headers)) ?? "";
    const userIdTwitch =
      (await this.getTwitchUserData(userName, headers)) ?? "";

    const connection = await this.prisma.serviceConnection.findFirst({
      where: { userId, service: { name: "twitch" } },
    });
    if (!connection) {
      this.logger.warn(
        `No Twitch connection found for user ${userId.toString()}. Cannot send chat.`,
      );
      return;
    }
    this.logger.log(
      `Sending Twitch chat message for user ${userId.toString()}`,
    );
    try {
      await firstValueFrom(
        this.httpService.post(
          "https://api.twitch.tv/helix/chat/messages",
          {
            broadcaster_id: broadcastId,
            sender_id: userIdTwitch,
            message: message,
          },
          { headers },
        ),
      );
      this.logger.log(`Successfully sent chat for user ${userId.toString()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send a chat for user ${userId.toString()}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
