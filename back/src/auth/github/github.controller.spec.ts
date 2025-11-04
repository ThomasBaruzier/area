import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Request, Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { TriggerService } from "../../reactions/trigger.service";
import { AuthService } from "../auth.service";
import { AuthOrigin, type DecodedStateDto } from "../decoded-state.decorator";
import type { AuthenticatedGithubRequest } from "./github.controller";
import { GithubController } from "./github.controller";
import { GithubService } from "./github.service";
import type { GithubAuthUser } from "./github.strategy";

const mockTriggerService = {
  handleTrigger: jest.fn(),
};

const mockAuthService = {
  handleOAuthCallback: jest.fn(),
};

const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
};

const mockRes = {
  redirect: jest.fn(),
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockGithubService = {
  checkUrlRepoUser: jest.fn(),
};

describe("GithubController", () => {
  let controller: GithubController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubController],
      providers: [
        { provide: GithubService, useValue: mockGithubService },
        { provide: TriggerService, useValue: mockTriggerService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CustomLogger, useValue: mockLogger },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<GithubController>(GithubController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("githubWebHooks", () => {
    it('should handle a "push" event', async () => {
      const req = {
        headers: { "x-github-event": "push" },
        body: { some: "payload" },
      } as unknown as Request;

      await controller.githubWebHooks(req);

      expect(mockTriggerService.handleTrigger).toHaveBeenCalledWith(
        "github",
        "push",
        { some: "payload" },
        undefined,
      );
    });

    it('should handle an "issues" event', async () => {
      const req = {
        headers: { "x-github-event": "issues" },
        body: { action: "opened", some: "payload" },
      } as unknown as Request;

      await controller.githubWebHooks(req);

      expect(mockTriggerService.handleTrigger).toHaveBeenCalledWith(
        "github",
        "issues",
        { action: "opened", some: "payload" },
        undefined,
      );
    });

    it("should ignore unsupported events", async () => {
      const req = {
        headers: { "x-github-event": "unsupported_event" },
        body: {},
      } as unknown as Request;

      await controller.githubWebHooks(req);

      expect(mockTriggerService.handleTrigger).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Ignoring unsupported GitHub event: unsupported_event",
      );
    });
  });

  describe("githubRedirect", () => {
    const mockGithubUser: GithubAuthUser = {
      identity: "github-id-123",
      email: "test@example.com",
      firstName: "Test",
      accessToken: "access_token",
      refreshToken: "refresh_token",
    };

    it("should handle successful OAuth callback", async () => {
      const req = { user: mockGithubUser };
      const state: DecodedStateDto = { origin: AuthOrigin.WEB };

      await controller.githubRedirect(
        req as unknown as AuthenticatedGithubRequest,
        mockRes as unknown as Response,
        state,
      );

      expect(mockAuthService.handleOAuthCallback).toHaveBeenCalledWith(
        req.user,
        "github",
        8 * 60 * 60 * 1000,
        state,
        mockRes,
      );
    });

    it("should handle OAuth callback with no email by logging a warning and calling authService", async () => {
      const req = { user: { ...mockGithubUser, email: null } };
      const state: DecodedStateDto = { origin: AuthOrigin.WEB };

      await controller.githubRedirect(
        req as unknown as AuthenticatedGithubRequest,
        mockRes as unknown as Response,
        state,
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "GitHub OAuth callback is missing email. Linking to existing user if session token is present.",
      );
      expect(mockAuthService.handleOAuthCallback).toHaveBeenCalledWith(
        req.user,
        "github",
        8 * 60 * 60 * 1000,
        state,
        mockRes,
      );
    });
  });
});
