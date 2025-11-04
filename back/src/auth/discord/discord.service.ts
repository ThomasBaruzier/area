import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { firstValueFrom } from "rxjs";

import { CustomLogger } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SendMessageDiscordDto } from "../../reactions/dto/reaction-data.dto";
import { formatMessage } from "../../utils/format-message";

@Injectable()
export class DiscordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(DiscordService.name);
  }

  async sendMessage(
    userId: number,
    payload: Record<string, unknown>,
    reactionData: Prisma.JsonValue,
  ): Promise<void> {
    const reactionDto = plainToInstance(SendMessageDiscordDto, reactionData);
    const errors = await validate(reactionDto);

    if (errors.length > 0) {
      this.logger.warn(
        `Invalid send_message (discord) data for user ${userId.toString()}: ${errors.toString()}`,
      );
      return;
    }

    const { channelId, message } = reactionDto;
    const finalMessage = formatMessage(message, payload);
    const botToken = this.configService.get<string>("DISCORD_BOT_TOKEN");

    if (!botToken) {
      this.logger.error("DISCORD_BOT_TOKEN is not configured.");
      return;
    }

    this.logger.log(
      `Sending Discord message to channel ${channelId} for user ${userId.toString()}`,
    );

    try {
      await firstValueFrom(
        this.httpService.post(
          `https://discord.com/api/v10/channels/${channelId}/messages`,
          { content: finalMessage },
          {
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );
      this.logger.log(
        `Successfully sent Discord message to channel ${channelId} for user ${userId.toString()}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send Discord message for user ${userId.toString()}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
