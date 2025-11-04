import { forwardRef, Global, Module } from "@nestjs/common";

import { DiscordModule } from "../auth/discord/discord.module";
import { GithubModule } from "../auth/github/github.module";
import { GmailModule } from "../auth/gmail/gmail.module";
import { MicrosoftModule } from "../auth/microsoft/microsoft.module";
import { SpotifyModule } from "../auth/spotify/spotify.module";
import { TwitchModule } from "../auth/twitch/twitch.module";
import { ReactionExecutor } from "./reaction-executor.service";
import { ReactionsController } from "./reactions.controller";
import { TriggerService } from "./trigger.service";

@Global()
@Module({
  imports: [
    forwardRef(() => GithubModule),
    forwardRef(() => GmailModule),
    forwardRef(() => MicrosoftModule),
    forwardRef(() => TwitchModule),
    forwardRef(() => DiscordModule),
    forwardRef(() => SpotifyModule),
  ],
  controllers: [ReactionsController],
  providers: [TriggerService, ReactionExecutor],
  exports: [TriggerService],
})
export class ReactionsModule {}
