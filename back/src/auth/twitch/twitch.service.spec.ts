import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Action, Workflow } from "@prisma/client";
import { AxiosHeaders, type AxiosResponse } from "axios";
import { of, throwError } from "rxjs";

import { CustomLogger } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import type { ValidatedUser } from "../auth.strategy";
import { TwitchService } from "./twitch.service";

describe("TwitchService", () => {
  let service: TwitchService;
  let httpService: HttpService;
  let prismaService: PrismaService;
  let logger: CustomLogger;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };
  const mockPrismaService = {
    workflow: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    serviceConnection: {
      findFirst: jest.fn(),
    },
  };
  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };
  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwitchService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();
    service = module.get<TwitchService>(TwitchService);
    httpService = module.get<HttpService>(HttpService);
    prismaService = module.get<PrismaService>(PrismaService);
    logger = module.get<CustomLogger>(CustomLogger);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getTwitchUserData", () => {
    it("should return user ID on success", async () => {
      const mockResponse: AxiosResponse = {
        data: { data: [{ id: "123" }] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      (httpService.get as jest.Mock).mockReturnValue(of(mockResponse));
      const result = await service.getTwitchUserData("testuser", {});
      expect(result).toBe("123");
    });

    it("should return null on failure", async () => {
      (httpService.get as jest.Mock).mockReturnValue(
        throwError(() => new Error("API Error")),
      );
      const result = await service.getTwitchUserData("testuser", {});
      expect(result).toBeNull();
    });
  });

  describe("checkTwitch", () => {
    const mockUser: ValidatedUser = {
      id: 1,
      email: "test@test.com",
      username: "test",
      role: "USER",
    };
    const mockWorkflow: Workflow & { action: Action } = {
      id: 1,
      action: { name: "stream_online" } as Action,
      actionJson: { streamerName: "teststreamer" },
    } as unknown as Workflow & { action: Action };

    it("should not run if workflow is not for Twitch", async () => {
      (prismaService.workflow.findUnique as jest.Mock).mockResolvedValue(null);
      await service.checkTwitch(mockUser, 1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "User 1 has no Twitch workflows, skipping webhook setup.",
      );
    });

    it("should warn if no Twitch connection", async () => {
      (prismaService.workflow.findUnique as jest.Mock).mockResolvedValue(
        mockWorkflow,
      );
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(null);
      await service.checkTwitch(mockUser, 1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "No twitch token for user 1, cannot set up webhooks.",
      );
    });
  });

  describe("makeWebhook", () => {
    it("should create webhook and update workflow identifier", async () => {
      const mockResponse: AxiosResponse = {
        data: { data: [{ id: "sub-id" }] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      (httpService.post as jest.Mock).mockReturnValue(of(mockResponse));
      jest.spyOn(service, "getTwitchUserData").mockResolvedValue("user-id");

      await service.makeWebhook(
        { streamerName: "test" },
        "stream_online",
        123,
        "user-token",
      );

      expect(httpService.post).toHaveBeenCalled();
      expect(prismaService.workflow.update).toHaveBeenCalledWith({
        where: { id: 123 },
        data: { identifier: "sub-id" },
      });
    });

    it("should throw error if getTwitchUserData returns null", async () => {
      jest.spyOn(service, "getTwitchUserData").mockResolvedValue(null);
      await expect(
        service.makeWebhook(
          { streamerName: "test" },
          "stream_online",
          123,
          "user-token",
        ),
      ).rejects.toThrow("Could not get user data for webhook");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to create Twitch webhook for workflow 123 for type stream.online: Could not get user data for webhook",
      );
    });
  });

  describe("sendMessageTwitchReaction", () => {
    it("should call Twitch API to send a message", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue({ token: "token" });
      jest.spyOn(service, "getTwitchUserData").mockResolvedValue("user-id");
      (httpService.post as jest.Mock).mockReturnValue(of({}));

      await service.sendMessageTwitchReaction(
        1,
        {},
        {
          userName: "u",
          streamerName: "s",
          message: "m",
        },
      );

      expect(httpService.post).toHaveBeenCalledWith(
        "https://api.twitch.tv/helix/chat/messages",
        expect.any(Object),
        expect.any(Object),
      );
    });

    it("should return early if reaction data is invalid", async () => {
      await service.sendMessageTwitchReaction(
        1,
        {},
        {
          userName: "u",
        },
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid create_issue reaction data"),
      );
    });

    it("should return if no service connection found", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(null);
      jest.spyOn(service, "getTwitchUserData").mockResolvedValue("user-id");

      await service.sendMessageTwitchReaction(
        1,
        {},
        {
          userName: "u",
          streamerName: "s",
          message: "m",
        },
      );

      expect(logger.warn).toHaveBeenCalledWith(
        "No Twitch connection found for user 1. Cannot send chat.",
      );
    });

    it("should handle API error when sending message", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue({ token: "token" });
      jest.spyOn(service, "getTwitchUserData").mockResolvedValue("user-id");
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error("API Error")),
      );

      await service.sendMessageTwitchReaction(
        1,
        {},
        {
          userName: "u",
          streamerName: "s",
          message: "m",
        },
      );

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to send a chat for user 1: API Error",
        expect.anything(),
      );
    });
  });

  describe("makeWebhook for different actions", () => {
    beforeEach(() => {
      (httpService.post as jest.Mock).mockReturnValue(
        of({
          data: { data: [{ id: "sub-id" }] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: { headers: new AxiosHeaders() },
        }),
      );
      jest.spyOn(service, "getTwitchUserData").mockResolvedValue("user-id");
      (httpService.get as jest.Mock).mockReturnValue(
        of({
          data: { data: [{ id: "user-id-from-token" }] },
        }),
      );
    });

    it("should handle stream_online action", async () => {
      await service.makeWebhook(
        { streamerName: "test" },
        "stream_online",
        123,
        "user-token",
      );

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: "stream.online",
        }),
        expect.any(Object),
      );
      expect(prismaService.workflow.update).toHaveBeenCalledWith({
        where: { id: 123 },
        data: { identifier: "sub-id" },
      });
    });

    it("should handle stream_offline action", async () => {
      await service.makeWebhook(
        { streamerName: "test" },
        "stream_offline",
        123,
        "user-token",
      );

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: "stream.offline",
        }),
        expect.any(Object),
      );
    });

    it("should handle user_update action", async () => {
      await service.makeWebhook(
        { userName: "test" },
        "user_update",
        123,
        "user-token",
      );

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: "user.update",
        }),
        expect.any(Object),
      );
    });

    it("should handle user_whisper_message action", async () => {
      await service.makeWebhook(
        { userName: "test" },
        "user_whisper_message",
        123,
        "user-token",
      );

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: "user.whisper.message",
        }),
        expect.any(Object),
      );
    });

    it("should handle error during webhook creation", async () => {
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error("Webhook Error")),
      );

      await expect(
        service.makeWebhook(
          { streamerName: "test" },
          "stream_online",
          123,
          "user-token",
        ),
      ).rejects.toThrow("Webhook Error");

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to create Twitch webhook for workflow 123 for type stream.online.",
      );
    });
  });

  describe("getTwitchUserData error handling", () => {
    it("should log error when user not found", async () => {
      const mockResponse: AxiosResponse = {
        data: { data: [] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      (httpService.get as jest.Mock).mockReturnValue(of(mockResponse));

      const result = await service.getTwitchUserData("testuser", {});
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "User twitch not found: testuser",
      );
    });
  });
});
