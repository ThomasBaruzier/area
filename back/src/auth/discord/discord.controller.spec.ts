import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { AuthService } from "../auth.service";
import { AuthOrigin, type DecodedStateDto } from "../decoded-state.decorator";
import type { AuthenticatedDiscordRequest } from "./discord.controller";
import { DiscordController } from "./discord.controller";
import type { DiscordAuthUser } from "./discord.strategy";

describe("DiscordController", () => {
  let controller: DiscordController;
  let authService: AuthService;

  const mockAuthService = {
    handleOAuthCallback: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockRes = {
    redirect: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscordController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<DiscordController>(DiscordController);
    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("discordRedirect", () => {
    it("should call authService.handleOAuthCallback on successful auth", async () => {
      const user: DiscordAuthUser = {
        identity: "discord-id-123",
        email: "test@discord.com",
        firstName: "TestUser",
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };
      const req = { user } as AuthenticatedDiscordRequest;
      const state: DecodedStateDto = { origin: AuthOrigin.WEB };

      await controller.discordRedirect(req, mockRes, state);

      expect(authService.handleOAuthCallback).toHaveBeenCalledWith(
        user,
        "discord",
        expect.any(Number),
        state,
        mockRes,
      );
    });
  });
});
