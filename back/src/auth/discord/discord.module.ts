import { HttpModule } from "@nestjs/axios";
import { forwardRef, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

import { AuthModule } from "../auth.module";
import { DiscordController } from "./discord.controller";
import { DiscordService } from "./discord.service";
import { DiscordStrategy } from "./discord.strategy";

@Module({
  imports: [
    PassportModule.register({ session: false }),
    HttpModule,
    forwardRef(() => AuthModule),
  ],
  providers: [DiscordStrategy, DiscordService],
  controllers: [DiscordController],
  exports: [DiscordService],
})
export class DiscordModule {}
