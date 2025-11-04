import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { type Request } from "express";
import { Strategy as _PassportSpotifyStrategy } from "passport-spotify";

import { CustomLogger } from "../../logger/logger.service";
import { type SpotifyAuthUser, SpotifyStrategy } from "./spotify.strategy";

jest.mock("passport-spotify", () => ({
  Strategy: jest.fn(),
}));

interface SpotifyProfile {
  id: string;
  displayName?: string;
  emails?: Array<{ value: string }>;
}

describe("SpotifyStrategy", () => {
  let strategy: SpotifyStrategy;
  let configService: ConfigService;
  let logger: CustomLogger;

  const mockConfigService = {
    getOrThrow: jest.fn(),
    get: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpotifyStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    strategy = module.get<SpotifyStrategy>(SpotifyStrategy);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<CustomLogger>(CustomLogger);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("authorizationParams", () => {
    it("should return authorization parameters with backend URL", () => {
      (configService.getOrThrow as jest.Mock).mockReturnValueOnce(
        "http://localhost:3000",
      );

      const options = {};
      const result = strategy.authorizationParams(options);

      expect(result).toEqual({
        ...options,
        access_type: "offline",
        prompt: "consent",
        auth_url: "https://accounts.spotify.com/authorize",
        developer_callback_url: "http://localhost:3000/auth/spotify/callback",
      });
    });
  });

  describe("validate", () => {
    it("should validate with complete profile", async () => {
      const mockReq = {} as Request;
      const accessToken = "access_token";
      const refreshToken = "refresh_token";
      const profile: SpotifyProfile = {
        id: "spotify-id-123",
        displayName: "John Doe",
        emails: [{ value: "john@example.com" }],
      };

      const result = await strategy.validate(
        mockReq,
        accessToken,
        refreshToken,
        profile,
      );

      expect(result).toEqual({
        identity: "spotify-id-123",
        email: "john@example.com",
        firstName: "John Doe",
        accessToken,
        refreshToken,
      });
      expect(logger.log).toHaveBeenCalledWith(
        "Validating Spotify profile for email: john@example.com",
      );
    });

    it("should handle profile with no emails", async () => {
      const mockReq = {} as Request;
      const accessToken = "access_token";
      const refreshToken = "refresh_token";
      const profile: SpotifyProfile = {
        id: "spotify-id-123",
        displayName: "John Doe",
        emails: [],
      };

      const result = await strategy.validate(
        mockReq,
        accessToken,
        refreshToken,
        profile,
      );

      expect(result).toEqual({
        identity: "spotify-id-123",
        email: null,
        firstName: "John Doe",
        accessToken,
        refreshToken,
      });
      expect(logger.log).toHaveBeenCalledWith(
        "Validating Spotify profile for email: unknown",
      );
    });

    it("should handle profile with no displayName", async () => {
      const mockReq = {} as Request;
      const accessToken = "access_token";
      const refreshToken = "refresh_token";
      const profile: SpotifyProfile = {
        id: "spotify-id-123",
        displayName: undefined,
        emails: [{ value: "john@example.com" }],
      };

      const result = await strategy.validate(
        mockReq,
        accessToken,
        refreshToken,
        profile,
      );

      expect(result).toEqual({
        identity: "spotify-id-123",
        email: "john@example.com",
        firstName: "spotify_user",
        accessToken,
        refreshToken,
      });
    });

    it("should handle profile with null displayName", async () => {
      const mockReq = {} as Request;
      const accessToken = "access_token";
      const refreshToken = "refresh_token";
      const profile: SpotifyProfile = {
        id: "spotify-id-123",
        displayName: undefined,
        emails: [{ value: "john@example.com" }],
      };

      const result: SpotifyAuthUser = await strategy.validate(
        mockReq,
        accessToken,
        refreshToken,
        profile,
      );

      expect(result).toEqual({
        identity: "spotify-id-123",
        email: "john@example.com",
        firstName: "spotify_user",
        accessToken,
        refreshToken,
      });
    });
  });
});
