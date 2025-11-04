import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { of } from "rxjs";

import { CustomLogger } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { DiscordService } from "./discord.service";

describe("DiscordService", () => {
  let service: DiscordService;
  let httpService: HttpService;
  let configService: ConfigService;
  let logger: CustomLogger;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

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
        DiscordService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<DiscordService>(DiscordService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<CustomLogger>(CustomLogger);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sendMessage", () => {
    const userId = 123;
    const payload = { message: "Hello World" };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should send a Discord message successfully", async () => {
      const reactionData = {
        channelId: "123456789",
        message: "Hello {{message}}!",
      };
      const expectedMessage = "Hello Hello World!";
      const botToken = "test-bot-token";

      (configService.get as jest.Mock).mockReturnValue(botToken);
      (httpService.post as jest.Mock).mockReturnValue(of({ data: {} }));

      await service.sendMessage(userId, payload, reactionData);

      expect(configService.get).toHaveBeenCalledWith("DISCORD_BOT_TOKEN");
      expect(httpService.post).toHaveBeenCalledWith(
        "https://discord.com/api/v10/channels/123456789/messages",
        { content: expectedMessage },
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
        },
      );
      expect(logger.log).toHaveBeenCalledWith(
        `Successfully sent Discord message to channel 123456789 for user ${userId.toString()}`,
      );
    });

    it("should handle invalid reaction data", async () => {
      const invalidReactionData = { channelId: "123456789" };

      await service.sendMessage(userId, payload, invalidReactionData);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `Invalid send_message (discord) data for user ${userId.toString()}`,
        ),
      );
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it("should not send message if DISCORD_BOT_TOKEN is not configured", async () => {
      const validReactionData = {
        channelId: "123456789",
        message: "Hello World",
      };

      (configService.get as jest.Mock).mockReturnValue(undefined);

      await service.sendMessage(userId, payload, validReactionData);

      expect(logger.error).toHaveBeenCalledWith(
        "DISCORD_BOT_TOKEN is not configured.",
      );
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it("should handle HTTP errors when sending message", async () => {
      const reactionData = { channelId: "123456789", message: "Hello World" };
      const botToken = "test-bot-token";
      const error = new Error("Network error");

      (configService.get as jest.Mock).mockReturnValue(botToken);
      (httpService.post as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await service.sendMessage(userId, payload, reactionData);

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to send Discord message for user ${userId.toString()}: Network error`,
        error.stack,
      );
    });
  });
});
