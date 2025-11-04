import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Profile } from "passport-github";
import { of, throwError } from "rxjs";

import { CustomLogger } from "../../logger/logger.service";
import { GithubStrategy } from "./github.strategy";

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    if (key === "BACKEND_URL") return "http://localhost:8080";
    if (key === "CLIENT_ID_GITHUB") return "test-id";
    if (key === "CLIENT_SECRET_GITHUB") return "test-secret";
    return "";
  }),
  get: jest.fn(),
};

const mockLogger = {
  setContext: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  error: jest.fn(),
};

const mockHttpService = {
  get: jest.fn(),
};

describe("GithubStrategy", () => {
  let strategy: GithubStrategy;
  let httpService: typeof mockHttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    strategy = module.get<GithubStrategy>(GithubStrategy);
    httpService = module.get(HttpService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    const accessToken = "test_access_token";
    const refreshToken = "test_refresh_token";
    const baseProfile: Profile = {
      id: "123",
      displayName: "Test User",
      username: "testuser",
      profileUrl: "",
      provider: "github",
      _raw: "",
      _json: {},
    };

    it("should return user with primary email", async () => {
      const emails = [
        { email: "secondary@test.com", primary: false, verified: true },
        { email: "primary@test.com", primary: true, verified: true },
      ];
      httpService.get.mockReturnValue(of({ data: emails }));

      const result = await strategy.validate(
        accessToken,
        refreshToken,
        baseProfile,
      );

      expect(result.email).toBe("primary@test.com");
      expect(result.firstName).toBe("Test User");
      expect(result.accessToken).toBe(accessToken);
    });

    it("should fallback to first verified email if no primary", async () => {
      const emails = [
        { email: "first@test.com", primary: false, verified: true },
        { email: "second@test.com", primary: false, verified: true },
      ];
      httpService.get.mockReturnValue(of({ data: emails }));

      const result = await strategy.validate(
        accessToken,
        refreshToken,
        baseProfile,
      );

      expect(result.email).toBe("first@test.com");
    });

    it("should return null email if no verified emails", async () => {
      const emails = [
        { email: "unverified@test.com", primary: true, verified: false },
      ];
      httpService.get.mockReturnValue(of({ data: emails }));

      const result = await strategy.validate(
        accessToken,
        refreshToken,
        baseProfile,
      );

      expect(result.email).toBeNull();
    });

    it("should handle http error when fetching emails", async () => {
      httpService.get.mockReturnValue(throwError(() => new Error("API Error")));

      const result = await strategy.validate(
        accessToken,
        refreshToken,
        baseProfile,
      );

      expect(result.email).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to fetch emails"),
      );
    });

    it("should use username as fallback for first name", async () => {
      const profileWithoutDisplayName = { ...baseProfile, displayName: "" };
      httpService.get.mockReturnValue(of({ data: [] }));

      const result = await strategy.validate(
        accessToken,
        refreshToken,
        profileWithoutDisplayName,
      );

      expect(result.firstName).toBe("testuser");
    });
  });

  describe("authorizationParams", () => {
    it("should include developer_callback_url", () => {
      const params = strategy.authorizationParams({});
      expect(params).toHaveProperty(
        "developer_callback_url",
        "http://localhost:8080/auth/github/callback",
      );
    });
  });
});
