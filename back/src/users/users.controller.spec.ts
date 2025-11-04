import { UnauthorizedException } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type * as PrismaClientModule from "@prisma/client";
import { Role } from "@prisma/client";

import type { AuthenticatedRequest } from "../auth/auth.type";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { EditUserDto } from "./dto/edit-user.dto";
import type { LoginUserDto } from "./dto/login-user.dto";
import { UsersController } from "./users.controller";
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

const mockUsersService = {
  findAll: jest.fn(),
  register: jest.fn(),
  login: jest.fn(),
  deleteUser: jest.fn(),
  editUser: jest.fn(),
  getConnections: jest.fn(),
  adminEditUserById: jest.fn(),
};

const mockUser = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  role: Role.USER,
};
const mockReq = { user: mockUser } as AuthenticatedRequest;
const mockAdminReq = {
  user: { ...mockUser, role: Role.ADMIN },
} as AuthenticatedRequest;

describe("UsersController", () => {
  let controller: UsersController;
  let service: typeof mockUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getUsers", () => {
    it("should get all users", async () => {
      const users = [mockUser];
      service.findAll.mockResolvedValue(users);

      const result = await controller.getUsers(mockAdminReq);

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });

    it("should throw UnauthorizedException if user is not admin", async () => {
      await expect(controller.getUsers(mockReq)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("register", () => {
    it("should register a new user", async () => {
      const createUserDto: CreateUserDto = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
      };
      const registeredUser = {
        id: 2,
        username: "newuser",
        email: "new@example.com",
        role: Role.USER,
      };
      service.register.mockResolvedValue(registeredUser);

      const result = await controller.register(createUserDto);

      expect(service.register).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(registeredUser);
    });
  });

  describe("login", () => {
    it("should log in a user", async () => {
      const loginDto: LoginUserDto = {
        email: "test@example.com",
        password: "password123",
      };
      const loginResponse = {
        user: { id: 1, username: "testuser", email: "test@example.com" },
        access_token: "some_token",
      };
      service.login.mockResolvedValue(loginResponse);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(result).toEqual(loginResponse);
    });
  });

  describe("deleteUser", () => {
    it("should delete the authenticated user", async () => {
      const response = { message: "User deleted" };
      service.deleteUser.mockResolvedValue(response);

      const result = await controller.deleteUser(mockReq);

      expect(service.deleteUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(response);
    });
  });

  describe("edit", () => {
    it("should edit the authenticated user", async () => {
      const editDto: EditUserDto = { username: "new_username" };
      const updatedUser = { ...mockUser, username: "new_username" };
      service.editUser.mockResolvedValue(updatedUser);

      const result = await controller.edit(mockReq, editDto);

      expect(service.editUser).toHaveBeenCalledWith(mockUser.id, editDto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe("getConnections", () => {
    it("should get user connections", async () => {
      const connections = ["github", "google"];
      service.getConnections.mockResolvedValue(connections);

      const result = await controller.getConnections(mockReq);

      expect(service.getConnections).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(connections);
    });
  });

  describe("adminDeleteUser", () => {
    it("should throw UnauthorizedException if user is not admin", async () => {
      await expect(controller.adminDeleteUser(mockReq, 2)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("adminEditUser", () => {
    it("should throw UnauthorizedException if user is not admin", async () => {
      await expect(controller.adminEditUser(mockReq, 2, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("promoteUser", () => {
    it("should throw UnauthorizedException if user is not admin", async () => {
      await expect(controller.promoteUser(mockReq, 2)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
