import { HttpModule } from "@nestjs/axios";
import { forwardRef, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

import { AuthModule } from "../auth.module";
import { CustomTwitchStrategy } from "./custom-twitch.strategy";
import { TwitchController } from "./twitch.controller";
import { TwitchService } from "./twitch.service";
import { TwitchStrategy } from "./twitch.strategy";

@Module({
  imports: [
    PassportModule.register({ session: false }),
    HttpModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [TwitchController],
  providers: [
    {
      provide: TwitchStrategy,
      useClass: CustomTwitchStrategy,
    },
    TwitchService,
  ],
  exports: [TwitchService],
})
export class TwitchModule {}
