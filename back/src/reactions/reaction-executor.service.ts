import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { DiscordService } from "../auth/discord/discord.service";
import { GithubService } from "../auth/github/github.service";
import { GmailService } from "../auth/gmail/gmail.service";
import { MicrosoftService } from "../auth/microsoft/microsoft.service";
import { SpotifyService } from "../auth/spotify/spotify.service";
import { TwitchService } from "../auth/twitch/twitch.service";
import { CustomLogger } from "../logger/logger.service";
import type { ReactionExecutionPayload } from "./trigger.service";

@Injectable()
export class ReactionExecutor {
  constructor(
    @Inject(forwardRef(() => GithubService))
    private readonly githubService: GithubService,
    @Inject(forwardRef(() => GmailService))
    private readonly gmailService: GmailService,
    private readonly microsoftService: MicrosoftService,
    private readonly twitchService: TwitchService,
    private readonly spotifyService: SpotifyService,
    private readonly discordService: DiscordService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(ReactionExecutor.name);
  }

  @OnEvent("reaction.execute")
  async executeReaction(eventPayload: ReactionExecutionPayload): Promise<void> {
    const { reaction, userId } = eventPayload;
    const { service } = reaction;
    this.logger.debug(
      `Received event to execute reaction '${reaction.name}' for user ID ${userId.toString()}`,
    );

    this.logger.log(
      `Executing reaction '${reaction.name}' for service '${
        service.name
      }' for user ID ${userId.toString()}`,
    );

    try {
      switch (service.name) {
        case "github":
          await this.executeGithubReaction(eventPayload);
          break;
        case "google":
          await this.executeGoogleReaction(eventPayload);
          break;
        case "microsoft":
          await this.executeMicrosoftReaction(eventPayload);
          break;
        case "twitch":
          await this.executeTwitchReaction(eventPayload);
          break;
        case "spotify":
          await this.executeSpotifyReaction(eventPayload);
          break;
        case "discord":
          await this.executeDiscordReaction(eventPayload);
          break;
        default:
          this.logger.warn(
            `Unknown service for reaction execution: ${service.name}`,
          );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error executing reaction '${
          reaction.name
        }' for user ${userId.toString()}: ${message}`,
        stack,
      );
    }
  }

  private async executeMicrosoftReaction(
    eventPayload: ReactionExecutionPayload,
  ): Promise<void> {
    const { reaction, payload, userId, reactionData } = eventPayload;
    switch (reaction.name) {
      case "send_mail":
        await this.microsoftService.sendMailReaction(
          userId,
          payload,
          reactionData,
        );
        break;
      default:
        this.logger.warn(`Unknown Microsoft reaction: ${reaction.name}`);
    }
  }

  private async executeGithubReaction(
    eventPayload: ReactionExecutionPayload,
  ): Promise<void> {
    const { reaction, payload, userId, reactionData } = eventPayload;
    switch (reaction.name) {
      case "create_issue":
        await this.githubService.createIssue(userId, payload, reactionData);
        break;
      case "create_release":
        await this.githubService.createRelease(userId, payload, reactionData);
        break;
      case "create_comment":
        await this.githubService.createComment(userId, payload, reactionData);
        break;
      default:
        this.logger.warn(`Unknown GitHub reaction: ${reaction.name}`);
    }
  }

  private async executeGoogleReaction(
    eventPayload: ReactionExecutionPayload,
  ): Promise<void> {
    const { reaction, payload, userId, reactionData } = eventPayload;
    switch (reaction.name) {
      case "send_mail":
        await this.gmailService.sendMailReaction(userId, payload, reactionData);
        break;
      default:
        this.logger.warn(`Unknown Google reaction: ${reaction.name}`);
    }
  }
  private async executeTwitchReaction(
    eventPayload: ReactionExecutionPayload,
  ): Promise<void> {
    const { reaction, payload, userId, reactionData } = eventPayload;
    switch (reaction.name) {
      case "send_message_twitch":
        await this.twitchService.sendMessageTwitchReaction(
          userId,
          payload,
          reactionData,
        );
        break;
      default:
        this.logger.warn(`Unknown Twitch reaction: ${reaction.name}`);
    }
  }

  private async executeSpotifyReaction(
    eventPayload: ReactionExecutionPayload,
  ): Promise<void> {
    const { reaction, payload, userId, reactionData } = eventPayload;
    switch (reaction.name) {
      case "create_playlist":
        await this.spotifyService.createPlaylist(userId, payload, reactionData);
        break;
      case "change_volume":
        await this.spotifyService.setPlaybackVolume(
          userId,
          payload,
          reactionData,
        );
        break;
      case "pause_playback":
        await this.spotifyService.pausePlayback(userId);
        break;
      case "skip_to_next":
        await this.spotifyService.skipToNext(userId);
        break;
      case "skip_to_previous":
        await this.spotifyService.skipToPrevious(userId);
        break;
      default:
        this.logger.warn(`Unknown Spotify reaction: ${reaction.name}`);
    }
  }

  private async executeDiscordReaction(
    eventPayload: ReactionExecutionPayload,
  ): Promise<void> {
    const { reaction, payload, userId, reactionData } = eventPayload;
    switch (reaction.name) {
      case "send_message":
        await this.discordService.sendMessage(userId, payload, reactionData);
        break;
      default:
        this.logger.warn(`Unknown Discord reaction: ${reaction.name}`);
    }
  }
}
