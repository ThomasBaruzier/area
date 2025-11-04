import { HttpModule } from "@nestjs/axios";
import { forwardRef, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

import { ReactionsModule } from "../../reactions/reactions.module";
import { AuthModule } from "../auth.module";
import { MicrosoftController } from "./microsoft.controller";
import { MicrosoftService } from "./microsoft.service";
import { MicrosoftStrategy } from "./microsoft.strategy";

@Module({
  imports: [
    PassportModule.register({ session: false }),
    HttpModule,
    forwardRef(() => AuthModule),
    forwardRef(() => ReactionsModule),
  ],
  providers: [MicrosoftStrategy, MicrosoftService],
  exports: [MicrosoftService],
  controllers: [MicrosoftController],
})
export class MicrosoftModule {}
