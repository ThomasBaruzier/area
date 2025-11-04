import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { CustomLogger } from "../../logger/logger.service";
import type { ProfileTwitch } from "./twitch.strategy";
import { TwitchStrategy } from "./twitch.strategy";

const mockConfigService = {
  getOrThrow: jest.fn((key: string): string => {
    switch (key) {
      case "BACKEND_URL":
        return "http://localhost:8080";
      case "CLIENT_ID_TWITCH":
        return "test-client-id";
      case "CLIENT_SECRET_TWITCH":
        return "test-client-secret";
      default:
        return "";
    }
  }),
  get: jest.fn(),
};

const mockLogger = {
  setContext: jest.fn(),
  debug: jest.fn(),
};

describe("TwitchStrategy", () => {
  let strategy: TwitchStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwitchStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();
    strategy = module.get<TwitchStrategy>(TwitchStrategy);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    const accessToken = "access-token";
    const refreshToken = "refresh-token";
    const profile: ProfileTwitch = {
      id: "twitch-id-123",
      displayName: "TestUser",
      email: "test@example.com",
    };

    it("should return a valid TwitchAuthUser", async () => {
      const result = await strategy.validate(
        accessToken,
        refreshToken,
        profile,
      );
      expect(result).toEqual({
        identity: "twitch-id-123",
        email: "test@example.com",
        firstName: "TestUser",
        accessToken,
        refreshToken,
      });
    });

    it("should handle null email", async () => {
      const profileWithoutEmail: ProfileTwitch = {
        ...profile,
        email: null,
      };
      const result = await strategy.validate(
        accessToken,
        refreshToken,
        profileWithoutEmail,
      );
      expect(result.email).toBeNull();
    });
  });
});
