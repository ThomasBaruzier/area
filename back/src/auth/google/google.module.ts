import { HttpModule } from "@nestjs/axios";
import { forwardRef, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

import { AuthModule } from "../auth.module";
import { GoogleController } from "./google.controller";
import { GoogleStrategy } from "./google.strategy";

@Module({
  imports: [
    PassportModule.register({ session: false }),
    HttpModule,
    forwardRef(() => AuthModule),
  ],
  providers: [GoogleStrategy],
  controllers: [GoogleController],
})
export class GoogleModule {}
