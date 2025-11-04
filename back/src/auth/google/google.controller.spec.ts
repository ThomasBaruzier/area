import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { AuthService } from "../auth.service";
import { DecodedStateDto } from "../decoded-state.decorator";
import type { AuthenticatedGoogleRequest } from "./google.controller";
import { GoogleController } from "./google.controller";
import type { GoogleAuthUser } from "./google.strategy";

const mockAuthService = {
  handleOAuthCallback: jest.fn(),
};
const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
const mockRes = {
  redirect: jest.fn(),
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
};

describe("GoogleController", () => {
  let controller: GoogleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<GoogleController>(GoogleController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("googleAuthRedirect", () => {
    const state = new DecodedStateDto();
    it("should handle OAuth callback for a user with an email", async () => {
      const user: GoogleAuthUser = {
        identity: "google-id-123",
        email: "test@example.com",
        firstName: "Test",
        accessToken: "at",
        refreshToken: "rt",
      };
      const req = { user };
      await controller.googleAuthRedirect(
        req as unknown as AuthenticatedGoogleRequest,
        mockRes as unknown as Response,
        state,
      );
      expect(mockAuthService.handleOAuthCallback).toHaveBeenCalledWith(
        user,
        "google",
        expect.any(Number),
        state,
        mockRes,
      );
    });

    it("should handle OAuth callback for a user without an email", async () => {
      const user: GoogleAuthUser = {
        identity: "google-id-456",
        email: null,
        firstName: "Test",
        accessToken: "at",
        refreshToken: "rt",
      };
      const req = { user };
      await controller.googleAuthRedirect(
        req as unknown as AuthenticatedGoogleRequest,
        mockRes as unknown as Response,
        state,
      );
      expect(mockAuthService.handleOAuthCallback).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith(
        "Email is required for authentication.",
      );
    });
  });
});
