import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  Partials,
} from "discord.js";

import { CustomLogger } from "../logger/logger.service";
import { TriggerService } from "../reactions/trigger.service";

@Injectable()
export class GatewayService implements OnModuleInit {
  private readonly client: Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly triggerService: TriggerService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(GatewayService.name);
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel],
    });
  }

  onModuleInit(): void {
    this.client.once(Events.ClientReady, () => {
      this.logger.log("Discord Gateway client is ready!");
    });

    this.client.on(Events.MessageCreate, (message: Message) => {
      if (message.author.bot) {
        return;
      }

      this.logger.debug(`New message in channel ${message.channelId}`);
      const payload = {
        channelId: message.channelId,
        guildId: message.guildId,
        content: message.content,
        author: {
          id: message.author.id,
          username: message.author.username,
        },
      };

      void this.triggerService
        .handleTrigger("discord", "new_message", payload, message.author.id)
        .catch((err: unknown) => {
          this.logger.error(
            "Failed to handle Discord message event",
            err instanceof Error ? err.stack : String(err),
          );
        });
    });

    const token = this.configService.get<string>("DISCORD_BOT_TOKEN");
    if (!token || token === "changeme") {
      this.logger.error(
        "DISCORD_BOT_TOKEN is not configured or is set to the default 'changeme' value.",
      );
      return;
    }
    this.client.login(token).catch((err: unknown) => {
      this.logger.error(
        "Failed to login to Discord Gateway",
        err instanceof Error ? err.stack : String(err),
      );
    });
  }
}
