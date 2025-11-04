import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type * as PrismaClientModule from "@prisma/client";
import { Role } from "@prisma/client";

import { CustomLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtStrategy } from "./auth.strategy";

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

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn((key: string): string | null => {
    if (key === "JWT_SECRET") {
      return "test-secret";
    }
    return null;
  }),
};

const mockLogger = {
  setContext: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  verbose: jest.fn(),
  error: jest.fn(),
};

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  it("should throw error if secret is not configured", () => {
    const configServiceWithoutSecret = { get: (): undefined => undefined };
    expect(
      () =>
        new JwtStrategy(
          configServiceWithoutSecret as unknown as ConfigService,
          prisma as unknown as PrismaService,
          mockLogger as unknown as CustomLogger,
        ),
    ).toThrow("FATAL ERROR: JWT_SECRET is not defined in .env.");
    expect(mockLogger.error).toHaveBeenCalledWith(
      "FATAL ERROR: JWT_SECRET is not defined in .env.",
    );
  });

  describe("validate", () => {
    it("should validate and return user", async () => {
      const user = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        role: Role.USER,
      };
      const payload = { sub: user.id, username: user.username };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await strategy.validate(payload);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: payload.sub },
        select: { id: true, username: true, email: true, role: true },
      });
      expect(result).toEqual(user);
    });

    it("should throw if user not found", async () => {
      const payload = { sub: 999, username: "nonexistent" };
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "JWT validation failed: user 999 not found.",
      );
    });
  });
});
