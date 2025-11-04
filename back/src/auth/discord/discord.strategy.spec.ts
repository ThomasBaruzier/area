import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Profile } from "passport-discord";

import { CustomLogger } from "../../logger/logger.service";
import { DiscordStrategy } from "./discord.strategy";

const mockConfigService = {
  getOrThrow: jest.fn((key: string): string => {
    switch (key) {
      case "BACKEND_URL":
        return "http://localhost:8080";
      case "CLIENT_ID_DISCORD":
        return "test-client-id";
      case "CLIENT_SECRET_DISCORD":
        return "test-client-secret";
      default:
        return "";
    }
  }),
  get: jest.fn(),
};

const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe("DiscordStrategy", () => {
  let strategy: DiscordStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();
    strategy = module.get<DiscordStrategy>(DiscordStrategy);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("authorizationParams", () => {
    it("should include developer_callback_url and correct permissions", () => {
      const params = strategy.authorizationParams({});
      expect(params).toEqual(
        expect.objectContaining({
          auth_url: "https://discord.com/oauth2/authorize",
          developer_callback_url: "http://localhost:8080/auth/discord/callback",
          permissions: 3072,
        }),
      );
    });
  });

  describe("validate", () => {
    const accessToken = "test-access-token";
    const refreshToken = "test-refresh-token";
    const profile: Profile = {
      id: "123",
      username: "testuser",
      discriminator: "0001",
      email: "test@example.com",
      verified: true,
      provider: "discord",
      fetchedAt: new Date().toISOString(),
    } as unknown as Profile;

    it("should return a valid DiscordAuthUser", async () => {
      const result = await strategy.validate(
        accessToken,
        refreshToken,
        profile,
      );
      expect(result).toEqual({
        identity: "123",
        email: "test@example.com",
        firstName: "testuser",
        accessToken,
        refreshToken,
      });
    });

    it("should use global_name as firstName if available", async () => {
      const profileWithGlobalName = { ...profile, global_name: "Test User" };
      const result = await strategy.validate(
        accessToken,
        refreshToken,
        profileWithGlobalName,
      );
      expect(result.firstName).toBe("Test User");
    });

    it("should handle null email", async () => {
      const profileWithoutEmail = { ...profile, email: undefined };
      const result = await strategy.validate(
        accessToken,
        refreshToken,
        profileWithoutEmail,
      );
      expect(result.email).toBeNull();
    });
  });
});
