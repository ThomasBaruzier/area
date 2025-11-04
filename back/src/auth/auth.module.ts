import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { PrismaModule } from "../prisma/prisma.module";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./auth.strategy";
import { ServiceConnectionService } from "./serviceConnection.service";

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ session: false }),
    HttpModule,
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: config.get("JWT_EXPIRATION") || "1h",
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, ServiceConnectionService],
  exports: [PassportModule, AuthService, JwtModule, ServiceConnectionService],
})
export class AuthModule {}
