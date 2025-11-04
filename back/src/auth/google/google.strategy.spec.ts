import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Request } from "express";
import type { Profile } from "passport-google-oauth20";

import { CustomLogger } from "../../logger/logger.service";
import { GoogleStrategy } from "./google.strategy";

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    if (key === "BACKEND_URL") return "http://localhost:8080";
    if (key === "CLIENT_ID_GOOGLE") return "test-id";
    if (key === "CLIENT_SECRET_GOOGLE") return "test-secret";
    return "";
  }),
  get: jest.fn(),
};

const mockLogger = {
  setContext: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

describe("GoogleStrategy", () => {
  let strategy: GoogleStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    const accessToken = "test_access_token";
    const refreshToken = "test_refresh_token";
    const mockRequest = {} as Request;

    it("should return user data from profile", async () => {
      const profile: Profile = {
        id: "123",
        displayName: "Test User",
        name: { givenName: "Test", familyName: "User" },
        emails: [{ value: "test@example.com", verified: true }],
        provider: "google",
        profileUrl: "https://profiles.google.com/123",
        _raw: "",
        _json: {
          iss: "https://accounts.google.com",
          azp: "test-client-id",
          aud: "test-client-id",
          sub: "123",
          iat: 1234567890,
          exp: 1234567890,
        },
      };

      const result = await strategy.validate(
        mockRequest,
        accessToken,
        refreshToken,
        profile,
      );

      expect(result.email).toBe("test@example.com");
      expect(result.firstName).toBe("Test");
      expect(result.accessToken).toBe(accessToken);
      expect(result.refreshToken).toBe(refreshToken);
    });

    it("should handle profile with no email", async () => {
      const profile: Profile = {
        id: "123",
        displayName: "Test User",
        name: { givenName: "Test", familyName: "User" },
        provider: "google",
        profileUrl: "https://profiles.google.com/123",
        _raw: "",
        _json: {
          iss: "https://accounts.google.com",
          azp: "test-client-id",
          aud: "test-client-id",
          sub: "123",
          iat: 1234567890,
          exp: 1234567890,
        },
      };

      const result = await strategy.validate(
        mockRequest,
        accessToken,
        refreshToken,
        profile,
      );

      expect(result.email).toBeNull();
      expect(result.identity).toBe("123");
    });

    it("should use fallback for first name if not present", async () => {
      const profile: Profile = {
        id: "123",
        displayName: "Test User",
        emails: [{ value: "test@example.com", verified: true }],
        provider: "google",
        profileUrl: "https://profiles.google.com/123",
        _raw: "",
        _json: {
          iss: "https://accounts.google.com",
          azp: "test-client-id",
          aud: "test-client-id",
          sub: "123",
          iat: 1234567890,
          exp: 1234567890,
        },
      };

      const result = await strategy.validate(
        mockRequest,
        accessToken,
        refreshToken,
        profile,
      );

      expect(result.firstName).toBe("google_user");
    });
  });

  describe("authorizationParams", () => {
    it("should include offline access_type and consent prompt", () => {
      const params = strategy.authorizationParams({});
      expect(params).toEqual(
        expect.objectContaining({
          access_type: "offline",
          prompt: "consent",
        }),
      );
    });
  });
});
