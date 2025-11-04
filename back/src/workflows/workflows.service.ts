import { Injectable, NotFoundException } from "@nestjs/common";
import type { Action, Reaction, Workflow } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { GithubService } from "../auth/github/github.service";
import { GmailService } from "../auth/gmail/gmail.service";
import { MicrosoftService } from "../auth/microsoft/microsoft.service";
import { TwitchService } from "../auth/twitch/twitch.service";
import { CustomLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateWorkflowDto } from "./dto/create-workflow.dto";
import type { UpdateWorkflowDto } from "./dto/update.dto";

type JsonData = Record<string, unknown>;

type WorkflowWithRelations = Workflow & {
  action: Action & { service: { name: string } };
  reactions: Reaction[];
};

export type WorkflowDto = {
  id: number;
  toggle: boolean;
  action: {
    actionId: number;
    serviceId: number;
    actionBody: JsonData;
  };
  reactions: {
    reactionId: number;
    serviceId: number;
    reactionBody: JsonData | null;
  }[];
};

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLogger,
    private readonly githubService: GithubService,
    private readonly gmailService: GmailService,
    private readonly microsoftService: MicrosoftService,
    private readonly twitchService: TwitchService,
  ) {
    this.logger.setContext(WorkflowsService.name);
  }

  private toWorkflowDto(wf: WorkflowWithRelations): WorkflowDto {
    const reactionsJson = wf.reactionsJson;
    const actionJson = wf.actionJson as JsonData;
    return {
      id: wf.id,
      toggle: wf.isEnabled,
      action: {
        actionId: wf.action.id,
        serviceId: wf.action.serviceId,
        actionBody: actionJson,
      },
      reactions: wf.reactions.map((r, i) => ({
        reactionId: r.id,
        serviceId: r.serviceId,
        reactionBody: reactionsJson[i] as JsonData,
      })),
    };
  }

  async getWorkflows(userId: number): Promise<WorkflowDto[]> {
    this.logger.debug(`Fetching workflows for user ${userId.toString()}`);
    const workflows = await this.prisma.workflow.findMany({
      where: { userId },
      include: {
        action: { include: { service: true } },
        reactions: true,
      },
    });
    this.logger.log(
      `Found ${workflows.length.toString()} workflows for user ${userId.toString()}`,
    );
    return workflows.map((wf) => this.toWorkflowDto(wf));
  }

  async createWorkflow(
    userId: number,
    dto: CreateWorkflowDto,
  ): Promise<WorkflowDto> {
    this.logger.debug(`User ${userId.toString()} creating new workflow`);
    const newWorkflow = await this.prisma.workflow.create({
      data: {
        isEnabled: dto.toggle ?? true,
        action: { connect: { id: dto.action.actionId } },
        actionJson:
          (dto.action.actionBody as Prisma.InputJsonValue) || Prisma.JsonNull,
        reactions: {
          connect: dto.reactions.map((r) => ({ id: r.reactionId })),
        },
        reactionsJson: dto.reactions.map((r) => {
          const reactionBody = r.reactionBody as Prisma.InputJsonValue;
          return reactionBody;
        }),
        user: { connect: { id: userId } },
      },
      include: { action: { include: { service: true } }, reactions: true },
    });
    const getIdCreatedWorkflow = newWorkflow.id;
    this.logger.log(
      `Created workflow ${newWorkflow.id.toString()} for user ${userId.toString()}`,
    );

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      if (newWorkflow.action.service.name === "github") {
        this.logger.log(
          `GitHub action detected. Triggering webhook check for user ${userId.toString()}`,
        );
        await this.githubService.checkUrlRepoUser(user);
      } else if (newWorkflow.action.service.name === "google") {
        this.logger.log(
          `Google action detected. Triggering watch setup for user ${userId.toString()}`,
        );
        try {
          await this.gmailService.startWatch(user);
        } catch (error) {
          this.logger.error(
            `Failed to start Gmail watch for user ${user.id.toString()}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      } else if (newWorkflow.action.service.name == "microsoft") {
        this.logger.log(
          `Microsoft action detected. Triggering watch setup for user ${userId.toString()}`,
        );
        try {
          await this.microsoftService.startWatch(userId, newWorkflow.id);
        } catch (error) {
          this.logger.error(
            `Failed to start Microsoft watch for user ${user.id.toString()}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      } else if (newWorkflow.action.service.name === "twitch") {
        this.logger.log(
          `Twitch action detected. Triggering watch setup for user ${userId.toString()}`,
        );
        try {
          await this.twitchService.checkTwitch(user, getIdCreatedWorkflow);
        } catch (error) {
          this.logger.error(
            `Failed to start Twitch watch for user ${user.id.toString()}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }

    return this.toWorkflowDto(newWorkflow);
  }

  async deleteWorkflow(
    userId: number,
    workflowId: number,
  ): Promise<WorkflowDto> {
    this.logger.debug(
      `User ${userId.toString()} deleting workflow ${workflowId.toString()}`,
    );
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
      include: { action: { include: { service: true } }, reactions: true },
    });
    if (!workflow) {
      this.logger.warn(
        `Workflow ${workflowId.toString()} not found or not owned by user ${userId.toString()}`,
      );
      throw new NotFoundException(
        "Workflow not found or you don't have permission to delete it",
      );
    }

    await this.prisma.workflow.delete({ where: { id: workflowId } });
    this.logger.log(
      `Deleted workflow ${workflowId.toString()} for user ${userId.toString()}`,
    );
    return this.toWorkflowDto(workflow);
  }

  async updateWorkflow(
    userId: number,
    workflowId: number,
    dto: UpdateWorkflowDto,
  ): Promise<WorkflowDto> {
    this.logger.debug(
      `User ${userId.toString()} updating workflow ${workflowId.toString()}`,
    );
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      this.logger.warn(
        `Workflow ${workflowId.toString()} not found or not owned by user ${userId.toString()}`,
      );
      throw new NotFoundException(
        "Workflow not found or you don't have permission to edit it",
      );
    }

    const data: Prisma.WorkflowUpdateInput = {};

    if (dto.toggle !== undefined) data.isEnabled = dto.toggle;

    if (dto.action) {
      if (dto.action.actionId)
        data.action = { connect: { id: dto.action.actionId } };
      if (dto.action.actionBody !== undefined)
        data.actionJson =
          (dto.action.actionBody as Prisma.InputJsonValue) || Prisma.JsonNull;
    }

    if (dto.reactions) {
      data.reactions = {
        set: [],
        connect: dto.reactions
          .filter((r) => r.reactionId)
          .map((r) => ({ id: r.reactionId })),
      };
      if (dto.reactions.every((r) => r.reactionBody !== undefined)) {
        data.reactionsJson = dto.reactions.map((r) => {
          const reactionBody = r.reactionBody as Prisma.InputJsonValue;
          return reactionBody;
        });
      }
    }

    const updatedWorkflow = await this.prisma.workflow.update({
      where: { id: workflowId },
      data,
      include: { action: { include: { service: true } }, reactions: true },
    });
    this.logger.log(
      `Updated workflow ${workflowId.toString()} for user ${userId.toString()}`,
    );
    return this.toWorkflowDto(updatedWorkflow);
  }
}
