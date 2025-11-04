import type { ExecutionContext } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import * as crypto from "crypto";
import type { Request } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { GithubWebhookGuard } from "./github-webhook.guard";

const mockExecutionContext = (
  request: Partial<Request & { rawBody: Buffer }>,
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as unknown as ExecutionContext;

describe("GithubWebhookGuard", () => {
  let guard: GithubWebhookGuard;
  let configService: ConfigService;

  const mockLogger = {
    setContext: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubWebhookGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    guard = module.get<GithubWebhookGuard>(GithubWebhookGuard);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("should throw BadRequestException if signature is missing", () => {
    const context = mockExecutionContext({ headers: {} });
    expect(() => guard.canActivate(context)).toThrow(
      new BadRequestException("Missing X-Hub-Signature-256 header"),
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Webhook request rejected: Missing X-Hub-Signature-256 header.",
    );
  });

  it("should throw BadRequestException if secret is not configured", () => {
    jest.spyOn(configService, "get").mockReturnValue(undefined);
    const context = mockExecutionContext({
      headers: { "x-hub-signature-256": "sha256=somesig" },
    });
    expect(() => guard.canActivate(context)).toThrow(
      new BadRequestException("Webhook secret is not configured."),
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      "Webhook secret is not configured on the server.",
    );
  });

  it("should throw BadRequestException for invalid signature", () => {
    const secret = "my-secret";
    jest.spyOn(configService, "get").mockReturnValue(secret);
    const context = mockExecutionContext({
      headers: { "x-hub-signature-256": "sha256=invalidsignature" },
      rawBody: Buffer.from("some payload"),
    });

    expect(() => guard.canActivate(context)).toThrow(
      new BadRequestException("Invalid signature."),
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Webhook request rejected: Invalid signature.",
    );
  });

  it("should return true for a valid signature", () => {
    const secret = "my-secret";
    const payload = "some payload";
    const hmac = crypto.createHmac("sha256", secret);
    const signature = "sha256=" + hmac.update(payload).digest("hex");
    jest.spyOn(configService, "get").mockReturnValue(secret);

    const context = mockExecutionContext({
      headers: { "x-hub-signature-256": signature },
      rawBody: Buffer.from(payload),
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Webhook signature validated successfully.",
    );
  });
});
