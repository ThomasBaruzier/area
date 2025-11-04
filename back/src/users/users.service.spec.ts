import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type * as PrismaClientModule from "@prisma/client";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

import { CustomLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";

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

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  serviceConnection: {
    findMany: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
};

const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe("UsersService", () => {
  let service: UsersService;
  let prisma: typeof mockPrismaService;
  let configService: typeof mockConfigService;
  let jwtService: typeof mockJwtService;
  const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
    configService = module.get(ConfigService);
    jwtService = module.get(JwtService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return an array of users mapped to UserDto", async () => {
      const users = [
        {
          id: 1,
          username: "user1",
          email: "user1@test.com",
          role: Role.USER,
        },
        {
          id: 2,
          username: "user2",
          email: "user2@test.com",
          role: Role.ADMIN,
        },
      ];
      prisma.user.findMany.mockResolvedValue(users);
      const result = await service.findAll();
      expect(result).toEqual(users);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  describe("register", () => {
    const createUserDto = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    };

    it("should register a new user successfully", async () => {
      const hashedPassword = "hashedpassword";
      const newUser = {
        id: 1,
        ...createUserDto,
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(null);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      prisma.user.create.mockResolvedValue(newUser);

      const result = await service.register(createUserDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        createUserDto.password,
        10,
      );
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          username: createUserDto.username,
          email: createUserDto.email,
          password: hashedPassword,
          role: "USER",
        },
      });
      expect(result).toEqual({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      });
    });

    it("should throw BadRequestException if email already exists", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: "test",
        email: "test@test.com",
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await expect(service.register(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("login", () => {
    let loginUser: {
      id: number;
      email: string;
      password: string;
      username: string;
      role: Role;
    };

    beforeEach(() => {
      loginUser = {
        id: 1,
        email: "test@example.com",
        password: "hashedpassword",
        username: "testuser",
        role: Role.USER,
      };
    });

    it("should login a user successfully and return a token", async () => {
      const expectedPayload = {
        sub: 1,
        username: "testuser",
        email: "test@example.com",
        role: Role.USER,
      };
      const jwtToken = "jwt_token";
      prisma.user.findUnique.mockResolvedValue(loginUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue(jwtToken);
      configService.get.mockImplementation((key: string) => {
        if (key === "JWT_EXPIRATION") {
          return "1h";
        }
        return "test_secret";
      });

      const result = await service.login("test@example.com", "password123");

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        "password123",
        loginUser.password,
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(expectedPayload, {
        secret: "test_secret",
        expiresIn: "1h",
      });
      expect(result.access_token).toBe(jwtToken);
    });

    it("should throw UnauthorizedException if user not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login("test@example.com", "password123"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException if password does not match", async () => {
      prisma.user.findUnique.mockResolvedValue(loginUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login("test@example.com", "wrongpassword"),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("deleteUser", () => {
    it("should delete a user", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        username: "test",
        email: "test@test.com",
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.user.delete.mockResolvedValue({
        id: 1,
        username: "test",
        email: "test@test.com",
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.deleteUser(1);
      expect(result).toEqual({
        message: `User with id 1 deleted successfully`,
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("should throw NotFoundException if user to delete is not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.deleteUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("editUser", () => {
    const userId = 1;
    const editUserDto = { username: "updatedUser", password: "newPassword" };
    const existingUser = {
      id: userId,
      username: "oldUser",
      email: "test@test.com",
      password: "oldHashedPassword",
      role: Role.USER,
    };

    it("should update a user and return the updated user DTO", async () => {
      const newHashedPassword = "newHashedPassword";
      const updatedUser = {
        ...existingUser,
        ...editUserDto,
        password: newHashedPassword,
      };

      prisma.user.findUnique.mockResolvedValue(existingUser);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue(newHashedPassword);
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.editUser(userId, editUserDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(editUserDto.password, 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          username: editUserDto.username,
          password: newHashedPassword,
        },
      });
      expect(result).toEqual({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
      });
    });

    it("should throw NotFoundException if user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.editUser(999, editUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("adminEditUserById", () => {
    const userId = 2;
    const existingUser = {
      id: userId,
      username: "user",
      email: "user@test.com",
      role: Role.USER,
    };

    it("should update username, email, and role successfully", async () => {
      const editDto = {
        username: "editedUser",
        email: "edited@test.com",
        role: Role.ADMIN,
      };
      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue({ ...existingUser, ...editDto });

      await service.adminEditUserById(userId, editDto);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: editDto,
      });
    });

    it("should update username and email without changing role", async () => {
      const editDto = {
        username: "editedUser",
        email: "edited@test.com",
      };
      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue({ ...existingUser, ...editDto });

      await service.adminEditUserById(userId, editDto);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: editDto,
      });
    });

    it("should throw NotFoundException if user to edit is not found", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.adminEditUserById(999, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getConnections", () => {
    it("should return a list of service names for a user", async () => {
      const userId = 1;
      const connections = [
        { service: { name: "github" } },
        { service: { name: "google" } },
      ];
      prisma.serviceConnection.findMany.mockResolvedValue(connections);

      const result = await service.getConnections(userId);

      expect(result).toEqual(["github", "google"]);
      expect(prisma.serviceConnection.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { service: { select: { name: true } } },
      });
    });

    it("should return an empty array for a user with no connections", async () => {
      const userId = 2;
      prisma.serviceConnection.findMany.mockResolvedValue([]);
      const result = await service.getConnections(userId);
      expect(result).toEqual([]);
    });
  });
});
