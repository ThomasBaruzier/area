import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Type,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { CustomLogger } from "src/logger/logger.service";

export function StatefulAuthGuard(strategy: string): Type<CanActivate> {
  @Injectable()
  class StatefulAuthGuardMixin extends AuthGuard(strategy) {
    constructor(private readonly logger: CustomLogger) {
      super();
      this.logger.setContext(`${StatefulAuthGuardMixin.name}(${strategy})`);
    }

    override getAuthenticateOptions(context: ExecutionContext): object {
      const request = context.switchToHttp().getRequest<Request>();
      const { state, origin, token } = request.query;

      if (state && typeof state === "string") {
        this.logger.debug(
          `Using existing state parameter from query: ${state}`,
        );
        return { state };
      }

      const stateObject: { origin?: string; token?: string } = {};
      if (origin === "mobile") {
        stateObject.origin = "mobile";
      } else {
        stateObject.origin = "web";
      }
      if (token && typeof token === "string") {
        stateObject.token = token;
      }

      this.logger.debug({
        message: "Generating new state parameter",
        from: { origin, token: token ? "[PRESENT]" : "[NOT PRESENT]" },
        generated: stateObject,
      });

      const encodedState = Buffer.from(JSON.stringify(stateObject)).toString(
        "base64",
      );

      this.logger.debug(`Encoded state: ${encodedState}`);

      return { state: encodedState };
    }
  }

  return StatefulAuthGuardMixin;
}
