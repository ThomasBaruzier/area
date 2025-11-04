import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Prisma, Reaction, Service, Workflow } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { CustomLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import { DiscordMessagePayloadDto } from "./dto/discord-payload.dto";
import {
  GithubIssuePayloadDto,
  GithubPullRequestPayloadDto,
  GithubPushPayloadDto,
} from "./dto/github-payload.dto";

export interface ReactionExecutionPayload {
  reaction: Reaction & { service: Service };
  payload: Record<string, unknown>;
  userId: number;
  reactionData: Prisma.JsonValue;
}

type ReactionInfo = Pick<
  Reaction,
  "id" | "name" | "description" | "jsonFormat"
>;

@Injectable()
export class TriggerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(TriggerService.name);
  }

  getReactionsByServiceId(serviceId: number): Promise<ReactionInfo[]> {
    return this.prisma.reaction.findMany({
      where: { serviceId: serviceId },
      select: {
        id: true,
        name: true,
        description: true,
        jsonFormat: true,
      },
    });
  }

  async handleTrigger(
    serviceName: string,
    event: string,
    payload: Record<string, unknown>,
    serviceUserIdentity?: string,
    identifier?: string,
  ): Promise<void> {
    this.logger.debug(
      `Handling trigger: ${serviceName}/${event} (identifier: ${
        identifier ?? "none"
      })`,
    );

    const service = await this.prisma.service.findUnique({
      where: { name: serviceName },
    });
    if (!service) return;

    const action = await this.prisma.action.findFirst({
      where: { name: event, serviceId: service.id },
    });
    if (!action) return;

    const workflowWhere: Prisma.WorkflowWhereInput = {
      actionId: action.id,
      isEnabled: true,
    };

    if (identifier) {
      workflowWhere.identifier = identifier;
    } else if (serviceUserIdentity) {
      const connections = await this.prisma.serviceConnection.findMany({
        where: {
          service: { name: serviceName },
          serviceUserIdentity: serviceUserIdentity,
        },
        select: { userId: true },
      });

      if (connections.length === 0) {
        this.logger.debug(
          `No service connection found for ${serviceName} identity ${serviceUserIdentity}`,
        );
        return;
      }
      const userIds = connections.map((conn) => conn.userId);
      workflowWhere.userId = { in: userIds };
    } else {
      this.logger.warn(
        `Trigger for ${serviceName}/${event} has no identity. Cannot find workflows.`,
      );
      return;
    }

    const workflows = await this.prisma.workflow.findMany({
      where: workflowWhere,
      include: {
        reactions: { include: { service: true } },
      },
    });

    if (workflows.length === 0) return;

    this.logger.log(
      `Found ${workflows.length.toString()} workflows for '${action.name}'`,
    );

    for (const workflow of workflows) {
      const match = await this._match(workflow, action.name, payload);
      if (match) {
        this.logger.log(
          `Workflow ${workflow.id.toString()} matched. Executing reactions.`,
        );
        for (const [index, reaction] of workflow.reactions.entries()) {
          const reactionData = workflow.reactionsJson[index];
          this.eventEmitter.emit("reaction.execute", {
            reaction,
            payload,
            userId: workflow.userId,
            reactionData,
          } satisfies ReactionExecutionPayload);
        }
      } else {
        this.logger.debug(
          `Workflow ${workflow.id.toString()} did not match payload.`,
        );
      }
    }
  }

  private async _match(
    workflow: Workflow,
    actionName: string,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    const actionConfig = workflow.actionJson;
    if (
      typeof actionConfig !== "object" ||
      actionConfig === null ||
      Array.isArray(actionConfig)
    ) {
      return true;
    }

    switch (actionName) {
      case "push":
        return this._matchGithubPush(workflow.id, payload, actionConfig);
      case "issues":
        return this._matchGithubIssue(workflow.id, payload, actionConfig);
      case "pull_request":
        return this._matchGithubPullRequest(workflow.id, payload, actionConfig);
      case "new_message":
        return this._matchDiscordMessage(workflow.id, payload, actionConfig);
      case "mail_received":
        return this._matchGoogleMail(payload, actionConfig);
      default:
        return true;
    }
  }

  private async _matchGithubPush(
    workflowId: number,
    payload: Record<string, unknown>,
    config: Prisma.JsonObject,
  ): Promise<boolean> {
    const payloadDto = plainToInstance(GithubPushPayloadDto, payload);
    const errors = await validate(payloadDto);
    if (errors.length > 0) {
      this.logger.warn(
        `Invalid GithubPushPayload for workflow ${workflowId.toString()}: ${errors.toString()}`,
      );
      return false;
    }

    const { owner, repo, branch } = config;
    let configOwner = typeof owner === "string" ? owner : null;
    let configRepo = typeof repo === "string" ? repo : null;

    if (configRepo && configRepo.includes("github.com")) {
      const urlMatch = configRepo.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (urlMatch && urlMatch[1] && urlMatch[2]) {
        configOwner = urlMatch[1];
        configRepo = urlMatch[2];
      }
    }

    if (configOwner && payloadDto.repository.owner.login !== configOwner)
      return false;
    if (configRepo && payloadDto.repository.name !== configRepo) return false;
    if (typeof branch === "string" && !payloadDto.ref.endsWith(`/${branch}`))
      return false;

    return true;
  }

  private async _matchGithubIssue(
    workflowId: number,
    payload: Record<string, unknown>,
    config: Prisma.JsonObject,
  ): Promise<boolean> {
    if (
      typeof payload.action !== "string" ||
      payload.action.toLowerCase() !== "opened"
    )
      return false;

    const payloadDto = plainToInstance(GithubIssuePayloadDto, payload);
    const errors = await validate(payloadDto);
    if (errors.length > 0) {
      this.logger.warn(
        `Invalid GithubIssuePayload for workflow ${workflowId.toString()}: ${errors.toString()}`,
      );
      return false;
    }

    const { owner, repo, label } = config;
    const labels = payloadDto.issue?.labels?.map((l) => l.name) || [];
    if (
      typeof owner === "string" &&
      payloadDto.repository.owner.login !== owner
    )
      return false;
    if (typeof repo === "string" && payloadDto.repository.name !== repo)
      return false;
    if (typeof label === "string" && !labels.includes(label)) return false;

    return true;
  }

  private async _matchGithubPullRequest(
    workflowId: number,
    payload: Record<string, unknown>,
    config: Prisma.JsonObject,
  ): Promise<boolean> {
    const payloadDto = plainToInstance(GithubPullRequestPayloadDto, payload);
    const errors = await validate(payloadDto);
    if (errors.length > 0) {
      this.logger.warn(
        `Invalid GithubPullRequestPayload for workflow ${workflowId.toString()}: ${errors.toString()}`,
      );
      return false;
    }

    const { owner, repo, prAction } = config;
    if (
      typeof owner === "string" &&
      payloadDto.repository.owner.login !== owner
    )
      return false;
    if (typeof repo === "string" && payloadDto.repository.name !== repo)
      return false;
    if (typeof prAction === "string" && payloadDto.action !== prAction)
      return false;

    return true;
  }

  private async _matchDiscordMessage(
    workflowId: number,
    payload: Record<string, unknown>,
    config: Prisma.JsonObject,
  ): Promise<boolean> {
    const payloadDto = plainToInstance(DiscordMessagePayloadDto, payload);
    const errors = await validate(payloadDto);
    if (errors.length > 0) {
      this.logger.warn(
        `Invalid DiscordMessagePayload for workflow ${workflowId.toString()}: ${errors.toString()}`,
      );
      return false;
    }
    const { channelId } = config;
    if (typeof channelId === "string" && payloadDto.channelId !== channelId) {
      return false;
    }
    return true;
  }

  private _matchGoogleMail(
    payload: Record<string, unknown>,
    config: Prisma.JsonObject,
  ): boolean {
    const { from, subject } = config;
    const payloadFrom =
      (typeof payload.from === "string" && payload.from) || "";
    const payloadSubject =
      (typeof payload.subject === "string" && payload.subject) || "";

    if (typeof from === "string" && !payloadFrom.includes(from)) {
      return false;
    }
    if (typeof subject === "string" && !payloadSubject.includes(subject)) {
      return false;
    }
    return true;
  }
}
