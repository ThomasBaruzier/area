import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { Client, Events, type Message } from "discord.js";

import { CustomLogger } from "../logger/logger.service";
import { TriggerService } from "../reactions/trigger.service";
import { GatewayService } from "./gateway.service";

const mockClientInstance = {
  once: jest.fn(),
  on: jest.fn(),
  login: jest.fn().mockResolvedValue("token"),
};

jest.mock("discord.js", () => {
  return {
    Client: jest.fn(() => mockClientInstance),
    Events: {
      ClientReady: "ready",
      MessageCreate: "messageCreate",
    },
    GatewayIntentBits: {
      Guilds: 1,
      GuildMessages: 2,
      MessageContent: 4,
    },
    Partials: {
      Channel: 1,
    },
  };
});

describe("GatewayService", () => {
  let service: GatewayService;
  let configService: ConfigService;
  let triggerService: TriggerService;

  const mockTriggerService = {
    handleTrigger: jest.fn().mockResolvedValue(undefined),
  };
  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        { provide: TriggerService, useValue: mockTriggerService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    (Client as unknown as jest.Mock).mockClear();
    mockClientInstance.once.mockClear();
    mockClientInstance.on.mockClear();
    mockClientInstance.login.mockClear();
    mockTriggerService.handleTrigger.mockClear();

    configService = module.get<ConfigService>(ConfigService);
    triggerService = module.get<TriggerService>(TriggerService);
    service = module.get<GatewayService>(GatewayService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onModuleInit", () => {
    it("should log in if token is provided", () => {
      (configService.get as jest.Mock).mockReturnValue("test-token");
      service.onModuleInit();
      expect(mockClientInstance.login).toHaveBeenCalledWith("test-token");
    });

    it("should log error if token is not provided", () => {
      (configService.get as jest.Mock).mockReturnValue(null);
      service.onModuleInit();
      expect(mockClientInstance.login).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "DISCORD_BOT_TOKEN is not configured or is set to the default 'changeme' value.",
      );
    });

    it("should handle MessageCreate event and call trigger service", () => {
      (configService.get as jest.Mock).mockReturnValue("test-token");
      service.onModuleInit();

      const messageCreateCallback = mockClientInstance.on.mock.calls.find(
        (call: [string, unknown]) => call[0] === Events.MessageCreate,
      )?.[1] as (message: Message) => void;
      expect(messageCreateCallback).toBeDefined();

      const mockMessage = {
        author: { bot: false, id: "user1", username: "testuser" },
        channelId: "chan1",
        guildId: "guild1",
        content: "hello world",
      } as unknown as Message;
      messageCreateCallback(mockMessage);

      expect(triggerService.handleTrigger).toHaveBeenCalledWith(
        "discord",
        "new_message",
        {
          channelId: "chan1",
          guildId: "guild1",
          content: "hello world",
          author: { id: "user1", username: "testuser" },
        },
        "user1",
      );
    });

    it("should ignore messages from bots", () => {
      (configService.get as jest.Mock).mockReturnValue("test-token");
      service.onModuleInit();

      const messageCreateCallback = mockClientInstance.on.mock.calls.find(
        (call: [string, unknown]) => call[0] === Events.MessageCreate,
      )?.[1] as (message: Message) => void;

      const mockBotMessage = {
        author: { bot: true },
      } as unknown as Message;
      messageCreateCallback(mockBotMessage);

      expect(triggerService.handleTrigger).not.toHaveBeenCalled();
    });
  });
});
