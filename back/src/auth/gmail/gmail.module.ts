import { forwardRef, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { AuthModule } from "../auth.module";
import { GmailController } from "./gmail.controller";
import { GmailService } from "./gmail.service";

@Module({
  imports: [ScheduleModule.forRoot(), forwardRef(() => AuthModule)],
  controllers: [GmailController],
  providers: [GmailService],
  exports: [GmailService],
})
export class GmailModule {}
