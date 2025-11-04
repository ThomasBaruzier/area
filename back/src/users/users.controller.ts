import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import type { AuthenticatedRequest } from "../auth/auth.type";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminEditUserDto } from "./dto/admin-edit-user.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { EditUserDto } from "./dto/edit-user.dto";
import { LoginUserDto } from "./dto/login-user.dto";
import { LoginResponseDto, UserDto } from "./dto/user.dto";
import { UsersService } from "./users.service";

@Controller("api/user")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private assertAdmin(req: AuthenticatedRequest): void {
    if (req.user.role !== "ADMIN") {
      throw new UnauthorizedException("Admins only");
    }
  }

  @Get("list")
  @UseGuards(JwtAuthGuard)
  async getUsers(@Req() req: AuthenticatedRequest): Promise<UserDto[]> {
    this.assertAdmin(req);
    return this.usersService.findAll();
  }

  @Post("register")
  async register(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    return this.usersService.register(createUserDto);
  }

  @Post("login")
  async login(@Body() loginDto: LoginUserDto): Promise<LoginResponseDto> {
    return this.usersService.login(loginDto.email, loginDto.password);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteUser(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    return this.usersService.deleteUser(req.user.id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async edit(
    @Req() req: AuthenticatedRequest,
    @Body() editUserDto: EditUserDto,
  ): Promise<UserDto> {
    return this.usersService.editUser(req.user.id, editUserDto);
  }

  @Get("connections")
  @UseGuards(JwtAuthGuard)
  async getConnections(@Req() req: AuthenticatedRequest): Promise<string[]> {
    return this.usersService.getConnections(req.user.id);
  }

  @Delete("admin/:id")
  @UseGuards(JwtAuthGuard)
  async adminDeleteUser(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    this.assertAdmin(req);
    return this.usersService.deleteUser(id);
  }

  @Patch("admin/:id")
  @UseGuards(JwtAuthGuard)
  async adminEditUser(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body()
    body: AdminEditUserDto,
  ): Promise<UserDto> {
    this.assertAdmin(req);
    return this.usersService.adminEditUserById(id, body);
  }

  @Patch("admin/:id/promote")
  @UseGuards(JwtAuthGuard)
  async promoteUser(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<UserDto> {
    this.assertAdmin(req);
    return this.usersService.adminEditUserById(id, { role: "ADMIN" });
  }
}
