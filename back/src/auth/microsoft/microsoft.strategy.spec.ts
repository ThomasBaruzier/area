import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { CustomLogger } from "../../logger/logger.service";
import { MicrosoftStrategy } from "./microsoft.strategy";

const mockConfigService = {
  getOrThrow: jest.fn((key: string): string => {
    switch (key) {
      case "BACKEND_URL":
        return "http://localhost:8080";
      case "TENANT_ID_MICROSOFT":
        return "common";
      case "CLIENT_ID_MICROSOFT":
        return "test-client-id";
      case "CLIENT_SECRET_MICROSOFT":
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
  verbose: jest.fn(),
};

describe("MicrosoftStrategy", () => {
  let strategy: MicrosoftStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();
    strategy = module.get<MicrosoftStrategy>(MicrosoftStrategy);
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("authorizationParams", () => {
    it("should return correct params for proxy", () => {
      const params = strategy.authorizationParams({});
      expect(params).toEqual({
        prompt: "select_account",
        auth_url:
          "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        developer_callback_url: "http://localhost:8080/auth/microsoft/callback",
      });
    });
  });

  describe("validate", () => {
    const accessToken = "access-token";
    const refreshToken = "refresh-token";
    const profile = {
      id: "microsoft-id-123",
      displayName: "Test User",
      emails: [{ value: "test@example.com" }],
    };

    it("should return a valid OAuthUser", async () => {
      const result = await strategy.validate(
        accessToken,
        refreshToken,
        profile,
      );
      expect(result).toEqual({
        identity: "microsoft-id-123",
        email: "test@example.com",
        firstName: "Test User",
        accessToken,
        refreshToken,
      });
    });

    it("should handle profile with no email", async () => {
      const profileWithoutEmail = { ...profile, emails: undefined };
      const result = await strategy.validate(
        accessToken,
        refreshToken,
        profileWithoutEmail,
      );
      expect(result.email).toBeNull();
    });
  });
});
