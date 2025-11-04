import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { CustomLogger } from "./logger.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: CustomLogger) {
    this.logger.setContext(LoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      ip: string;
      headers: { "user-agent"?: string };
      user?: { id?: number; email?: string };
    }>();

    const userAgent = request.headers["user-agent"] || "";
    if (userAgent.toLowerCase().includes("wget")) {
      return next.handle();
    }

    const now = Date.now();
    const { method, url, ip } = request;
    const user = request.user;

    const userIdentifier = user
      ? ` (User: ${user.id?.toString() ?? user.email ?? "N/A"})`
      : "";

    this.logger.debug(
      `--> ${method} ${url} - from ${ip}${userIdentifier}`,
      context.getClass().name,
    );

    return next.handle().pipe(
      tap(() => {
        const response = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
        const { statusCode } = response;
        const delay = Date.now() - now;
        this.logger.debug(
          `<-- ${method} ${url} ${statusCode.toString()} [${delay.toString()}ms]`,
          context.getClass().name,
        );
      }),
    );
  }
}
