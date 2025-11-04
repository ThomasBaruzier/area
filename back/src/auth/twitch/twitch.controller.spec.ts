import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Request, Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { TriggerService } from "../../reactions/trigger.service";
import { AuthService } from "../auth.service";
import { AuthOrigin, type DecodedStateDto } from "../decoded-state.decorator";
import type { AuthenticatedTwitchRequest } from "./twitch.controller";
import { TwitchController } from "./twitch.controller";
import type { TwitchAuthUser } from "./twitch.strategy";

describe("TwitchController", () => {
  let controller: TwitchController;
  let authService: AuthService;
  let triggerService: TriggerService;

  const mockAuthService = {
    handleOAuthCallback: jest.fn(),
  };
  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
  };
  const mockTriggerService = {
    handleTrigger: jest.fn(),
  };
  const mockRes = {
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwitchController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CustomLogger, useValue: mockLogger },
        { provide: TriggerService, useValue: mockTriggerService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get<TwitchController>(TwitchController);
    authService = module.get<AuthService>(AuthService);
    triggerService = module.get<TriggerService>(TriggerService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("twitchCallback", () => {
    it("should call authService.handleOAuthCallback", async () => {
      const user: TwitchAuthUser = {
        identity: "twitch-id-123",
        email: "test@twitch.tv",
        firstName: "Test",
        accessToken: "at",
        refreshToken: "rt",
      };
      const req = { user } as AuthenticatedTwitchRequest;
      const state: DecodedStateDto = { origin: AuthOrigin.WEB };

      await controller.twitchCallback(mockRes, req, state);
      expect(authService.handleOAuthCallback).toHaveBeenCalledWith(
        user,
        "twitch",
        expect.any(Number),
        state,
        mockRes,
      );
    });
  });

  describe("twitchWebhook", () => {
    it("should handle verification challenge", async () => {
      const req = {
        headers: {
          "twitch-eventsub-message-type": "webhook_callback_verification",
        },
        body: { challenge: "test-challenge" },
      } as unknown as Request;

      await controller.twitchWebhook(req, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.type).toHaveBeenCalledWith("text/plain");
      expect(mockRes.send).toHaveBeenCalledWith("test-challenge");
    });

    it("should handle notifications and call triggerService", async () => {
      const req = {
        headers: { "twitch-eventsub-message-type": "notification" },
        body: {
          subscription: { id: "sub-id", type: "stream.online" },
          event: { broadcaster_user_name: "test" },
        },
      } as unknown as Request;

      await controller.twitchWebhook(req, mockRes);

      expect(triggerService.handleTrigger).toHaveBeenCalledWith(
        "twitch",
        "stream_online",
        { broadcaster_user_name: "test" },
        undefined,
        "sub-id",
      );
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it("should ignore unsupported events", async () => {
      const req = {
        headers: { "twitch-eventsub-message-type": "notification" },
        body: {
          subscription: { id: "sub-id", type: "unsupported.event" },
          event: {},
        },
      } as unknown as Request;

      await controller.twitchWebhook(req, mockRes);
      expect(triggerService.handleTrigger).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });
  });
});
