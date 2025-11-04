import { HttpModule } from "@nestjs/axios";
import { forwardRef, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

import { AuthModule } from "../auth.module";
import { SpotifyController } from "./spotify.controller";
import { SpotifyService } from "./spotify.service";
import { SpotifyStrategy } from "./spotify.strategy";

@Module({
  imports: [
    PassportModule.register({ session: false }),
    HttpModule,
    forwardRef(() => AuthModule),
  ],
  providers: [SpotifyStrategy, SpotifyService],
  controllers: [SpotifyController],
  exports: [SpotifyService],
})
export class SpotifyModule {}
