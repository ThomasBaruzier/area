import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Reaction, Service } from "@prisma/client";

import { DiscordService } from "../auth/discord/discord.service";
import { GithubService } from "../auth/github/github.service";
import { GmailService } from "../auth/gmail/gmail.service";
import { MicrosoftService } from "../auth/microsoft/microsoft.service";
import { SpotifyService } from "../auth/spotify/spotify.service";
import { TwitchService } from "../auth/twitch/twitch.service";
import { CustomLogger } from "../logger/logger.service";
import { ReactionExecutor } from "./reaction-executor.service";
import type { ReactionExecutionPayload } from "./trigger.service";

describe("ReactionExecutor", () => {
  let service: ReactionExecutor;
  let githubService: GithubService;
  let gmailService: GmailService;
  let spotifyService: SpotifyService;
  let discordService: DiscordService;
  let twitchService: TwitchService;
  let microsoftService: MicrosoftService;
  let logger: CustomLogger;

  const mockGithubService = {
    createIssue: jest.fn(),
    createRelease: jest.fn(),
    createComment: jest.fn(),
  };
  const mockGmailService = { sendMailReaction: jest.fn() };
  const mockSpotifyService = {
    createPlaylist: jest.fn(),
    setPlaybackVolume: jest.fn(),
    pausePlayback: jest.fn(),
    skipToNext: jest.fn(),
    skipToPrevious: jest.fn(),
  };
  const mockDiscordService = { sendMessage: jest.fn() };
  const mockTwitchService = { sendMessageTwitchReaction: jest.fn() };
  const mockMicrosoftService = { sendMailReaction: jest.fn() };
  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionExecutor,
        { provide: GithubService, useValue: mockGithubService },
        { provide: GmailService, useValue: mockGmailService },
        { provide: TwitchService, useValue: mockTwitchService },
        { provide: SpotifyService, useValue: mockSpotifyService },
        { provide: DiscordService, useValue: mockDiscordService },
        { provide: MicrosoftService, useValue: mockMicrosoftService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ReactionExecutor>(ReactionExecutor);
    githubService = module.get<GithubService>(GithubService);
    gmailService = module.get<GmailService>(GmailService);
    spotifyService = module.get<SpotifyService>(SpotifyService);
    discordService = module.get<DiscordService>(DiscordService);
    twitchService = module.get<TwitchService>(TwitchService);
    microsoftService = module.get<MicrosoftService>(MicrosoftService);
    logger = module.get<CustomLogger>(CustomLogger);
    jest.clearAllMocks();
  });

  const createEventPayload = (
    serviceName: string,
    reactionName: string,
  ): ReactionExecutionPayload => ({
    userId: 123,
    payload: { triggerData: "some-value" },
    reactionData: { config: "reaction-config" },
    reaction: {
      name: reactionName,
      service: { name: serviceName } as Service,
    } as Reaction & { service: Service },
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("Reaction Dispatching", () => {
    it("should execute a single GitHub reaction", async () => {
      const payload = createEventPayload("github", "create_issue");
      await service.executeReaction(payload);
      expect(githubService.createIssue).toHaveBeenCalledWith(
        payload.userId,
        payload.payload,
        payload.reactionData,
      );
    });

    it("should execute a single Google reaction", async () => {
      const payload = createEventPayload("google", "send_mail");
      await service.executeReaction(payload);
      expect(gmailService.sendMailReaction).toHaveBeenCalledWith(
        payload.userId,
        payload.payload,
        payload.reactionData,
      );
    });

    it("should execute a single Microsoft reaction", async () => {
      const payload = createEventPayload("microsoft", "send_mail");
      await service.executeReaction(payload);
      expect(microsoftService.sendMailReaction).toHaveBeenCalledWith(
        payload.userId,
        payload.payload,
        payload.reactionData,
      );
    });

    it("should execute a single Discord reaction", async () => {
      const payload = createEventPayload("discord", "send_message");
      await service.executeReaction(payload);
      expect(discordService.sendMessage).toHaveBeenCalledWith(
        payload.userId,
        payload.payload,
        payload.reactionData,
      );
    });

    it("should execute a single Twitch reaction", async () => {
      const payload = createEventPayload("twitch", "send_message_twitch");
      await service.executeReaction(payload);
      expect(twitchService.sendMessageTwitchReaction).toHaveBeenCalledWith(
        payload.userId,
        payload.payload,
        payload.reactionData,
      );
    });

    it("should execute a single Spotify reaction", async () => {
      const payload = createEventPayload("spotify", "pause_playback");
      await service.executeReaction(payload);
      expect(spotifyService.pausePlayback).toHaveBeenCalledWith(payload.userId);
    });
  });

  describe("Error and Edge Case Handling", () => {
    it("should log a warning for an unknown service", async () => {
      const payload = createEventPayload("unknown_service", "any_reaction");
      await service.executeReaction(payload);
      expect(logger.warn).toHaveBeenCalledWith(
        "Unknown service for reaction execution: unknown_service",
      );
    });

    it("should log a warning for an unknown reaction within a known service", async () => {
      const payload = createEventPayload("github", "unknown_reaction");
      await service.executeReaction(payload);
      expect(logger.warn).toHaveBeenCalledWith(
        "Unknown GitHub reaction: unknown_reaction",
      );
    });

    it("should log an error but not crash if a reaction service throws an error", async () => {
      const payload = createEventPayload("github", "create_issue");
      const testError = new Error("GitHub API is down");
      (githubService.createIssue as jest.Mock).mockRejectedValue(testError);

      await service.executeReaction(payload);

      expect(logger.error).toHaveBeenCalledWith(
        "Error executing reaction 'create_issue' for user 123: GitHub API is down",
        testError.stack,
      );
    });
  });
});
