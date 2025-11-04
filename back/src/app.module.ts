import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { ActionsModule } from "./actions/actions.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { DiscordModule } from "./auth/discord/discord.module";
import { GithubModule } from "./auth/github/github.module";
import { GmailModule } from "./auth/gmail/gmail.module";
import { GoogleModule } from "./auth/google/google.module";
import { MicrosoftModule } from "./auth/microsoft/microsoft.module";
import { SpotifyModule } from "./auth/spotify/spotify.module";
import { TwitchModule } from "./auth/twitch/twitch.module";
import { DiscordGatewayModule } from "./discord/discord.gateway.module";
import { LoggerModule } from "./logger/logger.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ReactionsModule } from "./reactions/reactions.module";
import { ServicesModule } from "./services/services.module";
import { UsersModule } from "./users/users.module";
import { WorkflowsModule } from "./workflows/workflows.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    HttpModule,
    LoggerModule,
    AuthModule,
    DiscordModule,
    GoogleModule,
    GithubModule,
    GmailModule,
    PrismaModule,
    TwitchModule,
    UsersModule,
    ActionsModule,
    ReactionsModule,
    ServicesModule,
    WorkflowsModule,
    MicrosoftModule,
    SpotifyModule,
    DiscordGatewayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
