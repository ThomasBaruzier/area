import type { Role } from "@prisma/client";

export class UserDto {
  id: number;
  username: string;
  email: string;
  role: Role;
}

export class LoginResponseDto {
  user: {
    id: number;
    username: string;
    email: string;
  };
  access_token: string;
}
