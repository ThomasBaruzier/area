import { Module } from "@nestjs/common";

import { GithubModule } from "../auth/github/github.module";
import { GmailModule } from "../auth/gmail/gmail.module";
import { MicrosoftModule } from "../auth/microsoft/microsoft.module";
import { TwitchModule } from "../auth/twitch/twitch.module";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";

@Module({
  imports: [GithubModule, GmailModule, TwitchModule, MicrosoftModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
})
export class WorkflowsModule {}
