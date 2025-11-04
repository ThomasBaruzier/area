import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type * as PrismaClientModule from "@prisma/client";
import { Role } from "@prisma/client";
import type { Response } from "express";

import { CustomLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService, type OAuthUser } from "./auth.service";
import { AuthOrigin, type DecodedStateDto } from "./decoded-state.decorator";
import { ServiceConnectionService } from "./serviceConnection.service";

jest.mock("@prisma/client", () => {
  const originalModule: typeof PrismaClientModule =
    jest.requireActual("@prisma/client");
  return {
    __esModule: true,
    ...originalModule,
    Role: {
      USER: "USER",
      ADMIN: "ADMIN",
    },
  };
});

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};
const mockServiceConnectionService = {
  getServiceIdByName: jest.fn(),
  createOrUpdateServiceConnection: jest.fn(),
};
const mockConfigService = {
  get: jest.fn(),
  getOrThrow: jest.fn(),
};
const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};
const mockRes = {
  redirect: jest.fn(),
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

describe("AuthService", () => {
  let service: AuthService;
  let jwtService: typeof mockJwtService;
  let serviceConnectionService: typeof mockServiceConnectionService;
  let configService: typeof mockConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        {
          provide: ServiceConnectionService,
          useValue: mockServiceConnectionService,
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
    serviceConnectionService = module.get(ServiceConnectionService);
    configService = module.get(ConfigService);
    jest.resetAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createToken", () => {
    it("should create a JWT token", async () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        role: "USER",
      };
      const token = "test_token";
      jwtService.signAsync.mockResolvedValue(token);

      const result = await service.createToken(user);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
      expect(result).toEqual({ access_token: token });
    });
  });

  describe("handleOAuthCallback", () => {
    const oauthUser: OAuthUser = {
      identity: "user-identity-123",
      email: "test@example.com",
      firstName: "Test",
      accessToken: "access_token",
      refreshToken: "refresh_token",
    };
    const user = {
      id: 1,
      username: "Test",
      email: "test@example.com",
      role: Role.USER,
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const serviceId = 1;
    const expiresInMs = 3600000;
    const token = "jwt_token";

    beforeEach(() => {
      serviceConnectionService.getServiceIdByName.mockResolvedValue(serviceId);
      jwtService.signAsync.mockResolvedValue(token);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(user);
    });

    describe("when creating/logging in user via OAuth", () => {
      it("should handle web OAuth callback for Google", async () => {
        const serviceName = "google";
        const state: DecodedStateDto = { origin: AuthOrigin.WEB };
        configService.getOrThrow.mockReturnValue("http://localhost:8081");
        mockPrismaService.user.findUnique.mockResolvedValue(null);
        mockPrismaService.user.create.mockResolvedValue(user);

        await service.handleOAuthCallback(
          oauthUser,
          serviceName,
          expiresInMs,
          state,
          mockRes as unknown as Response,
        );

        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
          where: { email: oauthUser.email },
        });
        expect(
          serviceConnectionService.createOrUpdateServiceConnection,
        ).toHaveBeenCalled();

        expect(jwtService.signAsync).toHaveBeenCalled();
        expect(mockRes.redirect).toHaveBeenCalledWith(
          `http://localhost:8081/oauth-callback?token=${token}`,
        );
      });

      it("should handle mobile OAuth callback for Google", async () => {
        const serviceName = "google";
        const state: DecodedStateDto = { origin: AuthOrigin.MOBILE };
        mockPrismaService.user.findUnique.mockResolvedValue(null);
        mockPrismaService.user.create.mockResolvedValue(user);

        await service.handleOAuthCallback(
          oauthUser,
          serviceName,
          expiresInMs,
          state,
          mockRes as unknown as Response,
        );

        expect(mockRes.redirect).toHaveBeenCalledWith(
          `area-app://oauth-callback?token=${token}`,
        );
      });

      it("should handle GitHub OAuth callback", async () => {
        const serviceName = "github";
        const state: DecodedStateDto = { origin: AuthOrigin.WEB };
        configService.getOrThrow.mockReturnValue("http://localhost:8081");
        mockPrismaService.user.findUnique.mockResolvedValue(null);
        mockPrismaService.user.create.mockResolvedValue(user);

        await service.handleOAuthCallback(
          oauthUser,
          serviceName,
          expiresInMs,
          state,
          mockRes as unknown as Response,
        );

        expect(
          serviceConnectionService.createOrUpdateServiceConnection,
        ).toHaveBeenCalled();
        expect(jwtService.signAsync).toHaveBeenCalled();
        expect(mockRes.redirect).toHaveBeenCalledWith(
          `http://localhost:8081/oauth-callback?token=${token}`,
        );
      });

      it("should redirect with error if email is null and no linking token is present", async () => {
        const serviceName = "github";
        const state: DecodedStateDto = { origin: AuthOrigin.WEB };
        const userWithoutEmail = { ...oauthUser, email: null };
        configService.getOrThrow.mockReturnValue("http://localhost:8081");

        await service.handleOAuthCallback(
          userWithoutEmail,
          serviceName,
          expiresInMs,
          state,
          mockRes as unknown as Response,
        );

        expect(mockRes.redirect).toHaveBeenCalledWith(
          "http://localhost:8081/login?error=email-required",
        );
        expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
      });

      it("should handle failure in createOrUpdateServiceConnection", async () => {
        const serviceName = "google";
        const state: DecodedStateDto = { origin: AuthOrigin.WEB };
        configService.getOrThrow.mockReturnValue("http://localhost:8081");
        mockPrismaService.user.findUnique.mockResolvedValue(null);
        mockPrismaService.user.create.mockResolvedValue(user);
        serviceConnectionService.createOrUpdateServiceConnection.mockRejectedValue(
          new Error("DB error"),
        );

        await expect(
          service.handleOAuthCallback(
            oauthUser,
            serviceName,
            expiresInMs,
            state,
            mockRes as unknown as Response,
          ),
        ).rejects.toThrow("DB error");
      });
    });

    describe("when linking a service with an existing session", () => {
      const userJwtToken = "user-jwt-token";
      const jwtPayload = { sub: user.id };

      it("should link service to existing user if token is in state", async () => {
        const serviceName = "google";
        const state: DecodedStateDto = {
          origin: AuthOrigin.WEB,
          token: userJwtToken,
        };
        configService.getOrThrow.mockReturnValue("http://localhost:8081");

        mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
        mockPrismaService.user.findUnique.mockResolvedValue(user);

        await service.handleOAuthCallback(
          oauthUser,
          serviceName,
          expiresInMs,
          state,
          mockRes as unknown as Response,
        );

        expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(userJwtToken);
        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: user.id },
        });
        expect(
          serviceConnectionService.createOrUpdateServiceConnection,
        ).toHaveBeenCalled();
        expect(mockJwtService.signAsync).toHaveBeenCalled();
        expect(mockRes.redirect).toHaveBeenCalled();
      });

      it("should link service even if OAuth user has no email, when token is present", async () => {
        const serviceName = "github";
        const state: DecodedStateDto = {
          origin: AuthOrigin.WEB,
          token: userJwtToken,
        };
        const userWithoutEmail = { ...oauthUser, email: null };
        configService.getOrThrow.mockReturnValue("http://localhost:8081");

        mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
        mockPrismaService.user.findUnique.mockResolvedValue(user);

        await service.handleOAuthCallback(
          userWithoutEmail,
          serviceName,
          expiresInMs,
          state,
          mockRes as unknown as Response,
        );

        expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(userJwtToken);
        expect(
          serviceConnectionService.createOrUpdateServiceConnection,
        ).toHaveBeenCalled();
        expect(mockRes.redirect).toHaveBeenCalledWith(
          `http://localhost:8081/oauth-callback?token=${token}`,
        );
      });

      it("should redirect with error if user from token is not found", async () => {
        const serviceName = "google";
        const state: DecodedStateDto = {
          origin: AuthOrigin.WEB,
          token: userJwtToken,
        };
        configService.getOrThrow.mockReturnValue("http://localhost:8081");

        mockJwtService.verifyAsync.mockResolvedValue({ sub: 999 });
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        await service.handleOAuthCallback(
          oauthUser,
          serviceName,
          expiresInMs,
          state,
          mockRes as unknown as Response,
        );

        expect(mockRes.redirect).toHaveBeenCalledWith(
          "http://localhost:8081/login?error=user-not-found",
        );
        expect(
          serviceConnectionService.createOrUpdateServiceConnection,
        ).not.toHaveBeenCalled();
      });

      it("should redirect with error if token in state is invalid", async () => {
        const serviceName = "google";
        const state: DecodedStateDto = {
          origin: AuthOrigin.WEB,
          token: "invalid-token",
        };
        configService.getOrThrow.mockReturnValue("http://localhost:8081");

        mockJwtService.verifyAsync.mockRejectedValue(
          new Error("Invalid token"),
        );

        await service.handleOAuthCallback(
          oauthUser,
          serviceName,
          expiresInMs,
          state,
          mockRes as unknown as Response,
        );

        expect(mockRes.redirect).toHaveBeenCalledWith(
          "http://localhost:8081/login?error=invalid-token",
        );
        expect(
          serviceConnectionService.createOrUpdateServiceConnection,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
