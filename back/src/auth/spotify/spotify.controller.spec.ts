import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { type Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { AuthService } from "../auth.service";
import { AuthOrigin, type DecodedStateDto } from "../decoded-state.decorator";
import {
  type AuthenticatedSpotifyRequest,
  SpotifyController,
} from "./spotify.controller";

describe("SpotifyController", () => {
  let controller: SpotifyController;
  let authService: AuthService;
  let logger: CustomLogger;

  const mockAuthService = {
    handleOAuthCallback: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpotifyController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<SpotifyController>(SpotifyController);
    authService = module.get<AuthService>(AuthService);
    logger = module.get<CustomLogger>(CustomLogger);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("spotifyAuth", () => {
    it("should be defined", () => {
      expect(controller.spotifyAuth).toBeDefined();
    });
  });

  describe("spotifyRedirect", () => {
    it("should handle Spotify OAuth callback with valid user", async () => {
      const mockReq = {
        user: {
          email: "test@example.com",
          firstName: "Test",
          accessToken: "access_token",
          refreshToken: "refresh_token",
        },
      } as AuthenticatedSpotifyRequest;

      const mockRes = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        cookie: jest.fn(),
      } as unknown as Response;

      const mockState: DecodedStateDto = {
        origin: AuthOrigin.WEB,
      };

      await controller.spotifyRedirect(mockReq, mockRes, mockState);

      expect(logger.log).toHaveBeenCalledWith(
        "Handling Spotify OAuth callback.",
      );
      expect(authService.handleOAuthCallback).toHaveBeenCalledWith(
        {
          email: "test@example.com",
          firstName: "Test",
          accessToken: "access_token",
          refreshToken: "refresh_token",
        },
        "spotify",
        28800000,
        mockState,
        mockRes,
      );
    });

    it("should return error if email is missing", async () => {
      const mockReq = {
        user: {
          email: null,
          firstName: "Test",
          accessToken: "access_token",
          refreshToken: "refresh_token",
        },
      } as unknown as AuthenticatedSpotifyRequest;

      const mockRes = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        cookie: jest.fn(),
      } as unknown as Response;

      const mockState: DecodedStateDto = {
        origin: AuthOrigin.WEB,
      };

      (authService.handleOAuthCallback as jest.Mock).mockClear();

      await controller.spotifyRedirect(mockReq, mockRes, mockState);

      expect(logger.log).toHaveBeenCalledWith(
        "Spotify OAuth failed: Email is null. User needs to make it public.",
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith(
        "Email is required. Please make your Spotify email public.",
      );
      expect(authService.handleOAuthCallback).not.toHaveBeenCalled();
    });
  });
});
