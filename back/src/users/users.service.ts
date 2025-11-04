import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Prisma } from "@prisma/client";
import { compare, hash } from "bcrypt";

import { CustomLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AdminEditUserDto } from "./dto/admin-edit-user.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { EditUserDto } from "./dto/edit-user.dto";
import { LoginResponseDto, UserDto } from "./dto/user.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(UsersService.name);
  }

  async findAll(): Promise<UserDto[]> {
    this.logger.log("Fetching all users");
    const users = await this.prisma.user.findMany();
    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    }));
  }

  async register(data: CreateUserDto): Promise<UserDto> {
    this.logger.log(`Registering user with email: ${data.email}`);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      this.logger.warn(`Registration failed: email ${data.email} exists.`);
      throw new BadRequestException("Email already exists");
    }

    const hashedPassword: string = await hash(data.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: "USER",
      },
    });
    this.logger.log(
      `User ${newUser.username} registered with ID ${newUser.id.toString()}`,
    );
    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    };
  }

  async login(email: string, password: string): Promise<LoginResponseDto> {
    this.logger.log(`Login attempt for ${email}`);
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      this.logger.warn(
        `Login failed: user not found or no password for ${email}.`,
      );
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid: boolean = await compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(
        `Login failed: invalid password for user ${user.id.toString()}.`,
      );
      throw new UnauthorizedException("Invalid credentials");
    }

    this.logger.log(`Login successful for user ${user.id.toString()}`);

    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("JWT_SECRET"),
      expiresIn: this.configService.get("JWT_EXPIRATION") || "1h",
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      access_token: accessToken,
    };
  }

  async deleteUser(id: number): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser)
      throw new NotFoundException(`User with id ${id.toString()} not found`);

    await this.prisma.user.delete({ where: { id } });
    return { message: `User with id ${id.toString()} deleted successfully` };
  }

  async editUser(id: number, data: EditUserDto): Promise<UserDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: id },
    });
    if (!existingUser)
      throw new NotFoundException(`User with id ${id.toString()} not found`);

    const updateData: Prisma.UserUpdateInput = {};
    if (data.username) updateData.username = data.username;
    if (data.email) updateData.email = data.email;
    if (data.password) {
      const newPasswordHash: string = await hash(data.password, 10);
      updateData.password = newPasswordHash;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: id },
      data: updateData,
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
    };
  }

  async adminEditUserById(
    id: number,
    data: AdminEditUserDto,
  ): Promise<UserDto> {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser)
      throw new NotFoundException(`User with id ${id.toString()} not found`);

    const updateData: Prisma.UserUpdateInput = {};
    if (data.username) updateData.username = data.username;
    if (data.email) updateData.email = data.email;
    if (data.password) {
      const pwd = await hash(data.password, 10);
      updateData.password = pwd;
    }
    if (data.role) {
      updateData.role = data.role;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
    };
  }

  async getConnections(userId: number): Promise<string[]> {
    this.logger.debug(`Fetching connections for user ${userId.toString()}`);
    const connections = await this.prisma.serviceConnection.findMany({
      where: { userId },
      include: { service: { select: { name: true } } },
    });
    return connections.map((c) => c.service.name);
  }
}
