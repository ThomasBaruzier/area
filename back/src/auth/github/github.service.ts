import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { firstValueFrom } from "rxjs";

import { CustomLogger } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateIssueReactionDto } from "../../reactions/dto/reaction-data.dto";
import { CreateCommentReactionDto } from "../../reactions/dto/reaction-data.dto";
import { CreateReleaseReactionDto } from "../../reactions/dto/reaction-data.dto";
import { formatMessage } from "../../utils/format-message";
import type { ValidatedUser } from "../auth.strategy";

@Injectable()
export class GithubService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(GithubService.name);
  }

  async createIssue(
    userId: number,
    payload: Record<string, unknown>,
    reactionData: Prisma.JsonValue,
  ): Promise<void> {
    const reactionDto = plainToInstance(CreateIssueReactionDto, reactionData);
    const errors = await validate(reactionDto);

    if (errors.length > 0) {
      this.logger.warn(
        `Invalid create_issue reaction data for user ${userId.toString()}: ${errors.toString()}`,
      );
      return;
    }

    const { owner, repo, title, body } = reactionDto;

    const connection = await this.prisma.serviceConnection.findFirst({
      where: { userId, service: { name: "github" } },
    });

    if (!connection) {
      this.logger.warn(
        `No GitHub connection found for user ${userId.toString()}. Cannot create issue.`,
      );
      return;
    }

    const finalTitle = formatMessage(title ?? "New issue from AREA", payload);
    const finalBody = formatMessage(
      body ?? "This issue was automatically created by an AREA workflow.",
      payload,
    );

    this.logger.log(
      `Creating GitHub issue on ${owner}/${repo} for user ${userId.toString()}`,
    );

    try {
      await firstValueFrom(
        this.httpService.post(
          `https://api.github.com/repos/${owner}/${repo}/issues`,
          { title: finalTitle, body: finalBody },
          {
            headers: {
              Authorization: `token ${connection.token}`,
              "Content-Type": "application/json",
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        ),
      );
      this.logger.log(
        `Successfully created issue on ${owner}/${repo} for user ${userId.toString()}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create GitHub issue for user ${userId.toString()} on ${owner}/${repo}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async createComment(
    userId: number,
    payload: Record<string, unknown>,
    reactionData: Prisma.JsonValue,
  ): Promise<void> {
    const reactionDto = plainToInstance(CreateCommentReactionDto, reactionData);
    const errors = await validate(reactionDto);

    if (errors.length > 0) {
      this.logger.warn(
        `Invalid create_comment reaction data for user ${userId.toString()}: ${errors.toString()}`,
      );
      return;
    }

    const { owner, repo, issue_number: issueNumber, body } = reactionDto;

    const connection = await this.prisma.serviceConnection.findFirst({
      where: { userId, service: { name: "github" } },
    });

    if (!connection) {
      this.logger.warn(
        `No GitHub connection found for user ${userId.toString()}. Cannot create comment.`,
      );
      return;
    }

    const finalBody = formatMessage(body, payload);

    this.logger.log(
      `Creating comment on ${owner}/${repo}#${issueNumber.toString()} for user ${userId.toString()}`,
    );

    try {
      await firstValueFrom(
        this.httpService.post(
          `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber.toString()}/comments`,
          { body: finalBody },
          {
            headers: {
              Authorization: `token ${connection.token}`,
              "Content-Type": "application/json",
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        ),
      );
      this.logger.log(
        `Successfully created comment on ${owner}/${repo}#${issueNumber.toString()} for user ${userId.toString()}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create comment for user ${userId.toString()} on ${owner}/${repo}#${issueNumber.toString()}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async createRelease(
    userId: number,
    payload: Record<string, unknown>,
    reactionData: Prisma.JsonValue,
  ): Promise<void> {
    const reactionDto = plainToInstance(CreateReleaseReactionDto, reactionData);
    const errors = await validate(reactionDto);

    if (errors.length > 0) {
      this.logger.warn(
        `Invalid create_release reaction data for user ${userId.toString()}: ${errors.toString()}`,
      );
      return;
    }

    const {
      owner,
      repo,
      tag_name: tagName,
      name,
      body,
      target_commitish: targetCommitish,
    } = reactionDto;

    const connection = await this.prisma.serviceConnection.findFirst({
      where: { userId, service: { name: "github" } },
    });

    if (!connection) {
      this.logger.warn(
        `No GitHub connection found for user ${userId.toString()}. Cannot create release.`,
      );
      return;
    }

    const finalName = formatMessage(name ?? `Release ${tagName}`, payload);
    const finalBody = formatMessage(
      body ?? "This release was automatically created by an AREA workflow.",
      payload,
    );

    const releasePayload = {
      tag_name: tagName,
      name: finalName,
      body: finalBody,
      draft: false,
      prerelease: false,
      ...(targetCommitish ? { target_commitish: targetCommitish } : {}),
    };

    this.logger.log(
      `Creating GitHub release on ${owner}/${repo} for user ${userId.toString()}`,
    );

    try {
      await firstValueFrom(
        this.httpService.post(
          `https://api.github.com/repos/${owner}/${repo}/releases`,
          releasePayload,
          {
            headers: {
              Authorization: `token ${connection.token}`,
              "Content-Type": "application/json",
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        ),
      );
      this.logger.log(
        `Successfully created release on ${owner}/${repo} for user ${userId.toString()}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create GitHub release for user ${userId.toString()} on ${owner}/${repo}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async checkUrlRepoUser(user: ValidatedUser): Promise<void> {
    const workflows = await this.prisma.workflow.findMany({
      where: {
        userId: user.id,
        action: {
          service: {
            name: "github",
          },
        },
      },
      include: { action: { select: { name: true } } },
    });

    if (workflows.length === 0) {
      this.logger.debug(
        `User ${user.id.toString()} has no GitHub workflows, skipping webhook setup.`,
      );
      return;
    }

    const githubConnection = await this.prisma.serviceConnection.findFirst({
      where: { userId: user.id, service: { name: "github" } },
    });

    if (!githubConnection?.token) {
      this.logger.warn(
        `No GitHub token for user ${user.id.toString()}, cannot set up webhooks.`,
      );
      return;
    }

    const reposToWatch = new Map<string, Set<string>>();

    for (const workflow of workflows) {
      const actionConfig = workflow.actionJson as Prisma.JsonObject;
      if (
        typeof actionConfig.repo !== "string" ||
        typeof actionConfig.owner !== "string"
      ) {
        continue;
      }

      const repoKey = `${actionConfig.owner}/${actionConfig.repo}`;
      if (!reposToWatch.has(repoKey)) {
        reposToWatch.set(repoKey, new Set());
      }
      reposToWatch.get(repoKey)?.add(workflow.action.name);
    }

    for (const [repoKey, events] of reposToWatch.entries()) {
      const [owner, repo] = repoKey.split("/");
      try {
        await this.ensureWebhook(
          githubConnection.userId,
          githubConnection.token,
          owner,
          repo,
          Array.from(events),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error during webhook creation for ${repoKey}: ${message}`,
        );
      }
    }
  }

  private getWebhookUrl(): string {
    const proxyUrl = this.configService.get<string>("WEBHOOK_PROXY_URL");
    const backendUrl = this.configService.getOrThrow<string>("BACKEND_URL");
    const baseUrl = proxyUrl || backendUrl;
    return `${baseUrl}/auth/github/webhooks`;
  }

  private async ensureWebhook(
    userId: number,
    token: string,
    owner: string,
    repo: string,
    requiredEvents: string[],
  ): Promise<void> {
    const hooksUrl = `https://api.github.com/repos/${owner}/${repo}/hooks`;
    const webhookUrl = this.getWebhookUrl();
    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    try {
      const { data: existingHooks } = await firstValueFrom(
        this.httpService.get<
          { id: number; config: { url: string }; events: string[] }[]
        >(hooksUrl, { headers }),
      );

      const areaWebhook = existingHooks.find(
        (hook) => hook.config.url === webhookUrl,
      );

      if (areaWebhook) {
        const currentEvents = new Set(areaWebhook.events);
        const requiredEventsSet = new Set(requiredEvents);
        if (
          requiredEventsSet.size === currentEvents.size &&
          [...requiredEventsSet].every((e) => currentEvents.has(e))
        ) {
          this.logger.log(`Webhook for ${owner}/${repo} is up-to-date.`);
          return;
        }

        this.logger.log(
          `Updating webhook for ${owner}/${repo} with new events.`,
        );
        await firstValueFrom(
          this.httpService.patch(
            `${hooksUrl}/${areaWebhook.id.toString()}`,
            { events: requiredEvents },
            { headers },
          ),
        );
        this.logger.log(`Successfully updated webhook for ${owner}/${repo}.`);
      } else {
        this.logger.log(
          `Creating new webhook for ${owner}/${repo} for user ${userId.toString()}.`,
        );
        const secret = this.configService.get<string>("GITHUB_WEBHOOK_SECRET");
        await firstValueFrom(
          this.httpService.post(
            hooksUrl,
            {
              name: "web",
              active: true,
              events: requiredEvents,
              config: {
                url: webhookUrl,
                content_type: "json",
                secret: secret,
              },
            },
            { headers },
          ),
        );
        this.logger.log(
          `Successfully created webhook for ${owner}/${repo} for user ${userId.toString()} with events: ${requiredEvents.join(", ")}`,
        );
      }
    } catch (e) {
      this.logger.error(
        `Failed to ensure webhook for ${owner}/${repo} for user ${userId.toString()}: ${e instanceof Error ? e.message : String(e)}`,
      );
      throw e;
    }
  }
}
