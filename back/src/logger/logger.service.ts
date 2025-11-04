import { Injectable, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CustomLogger implements LoggerService {
  private context?: string;
  private readonly isDebug: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isDebug = this.configService.get<string>("DEBUG_LOGS") === "true";
  }

  public setContext(context: string): void {
    this.context = context;
  }

  log(message: unknown, context?: string): void {
    this.printMessage("LOG", message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.printMessage("ERROR", message, context);
    if (trace) {
      this.printMessage("ERROR", trace, context);
    }
  }

  warn(message: unknown, context?: string): void {
    this.printMessage("WARN", message, context);
  }

  debug(message: unknown, context?: string): void {
    if (this.isDebug) {
      this.printMessage("DEBUG", message, context);
    }
  }

  verbose(message: unknown, context?: string): void {
    if (this.isDebug) {
      this.printMessage("VERBOSE", message, context);
    }
  }

  private printMessage(
    level: "LOG" | "ERROR" | "WARN" | "DEBUG" | "VERBOSE",
    message: unknown,
    context?: string,
  ): void {
    const finalContext = context || this.context || "Application";
    const pid = process.pid;
    const timestamp = new Date().toISOString();

    const formattedMessage =
      typeof message === "object" && message !== null
        ? JSON.stringify(message, null, 2)
        : String(message);

    const output = `[Nest] ${pid.toString()}\t- ${timestamp}\t${level}\t[${finalContext}] ${formattedMessage}\n`;

    process.stdout.write(output);
  }
}
