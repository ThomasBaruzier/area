import { HttpModule } from "@nestjs/axios";
import { forwardRef, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

import { AuthModule } from "../auth.module";
import { GithubController } from "./github.controller";
import { GithubService } from "./github.service";
import { GithubStrategy } from "./github.strategy";

@Module({
  imports: [
    PassportModule.register({ session: false }),
    HttpModule,
    forwardRef(() => AuthModule),
  ],
  providers: [GithubStrategy, GithubService],
  controllers: [GithubController],
  exports: [GithubService],
})
export class GithubModule {}
