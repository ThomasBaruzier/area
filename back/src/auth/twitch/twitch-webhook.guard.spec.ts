import type { ExecutionContext } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import * as crypto from "crypto";
import type { Request } from "express";

import { CustomLogger } from "../../logger/logger.service";
import { TwitchWebhookGuard } from "./twitch-webhook.guard";

const mockExecutionContext = (
  request: Partial<Request & { rawBody: Buffer }>,
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as unknown as ExecutionContext;

describe("TwitchWebhookGuard", () => {
  let guard: TwitchWebhookGuard;
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
        TwitchWebhookGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    guard = module.get<TwitchWebhookGuard>(TwitchWebhookGuard);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("should throw BadRequestException if headers are missing", () => {
    const context = mockExecutionContext({ headers: {} });
    expect(() => guard.canActivate(context)).toThrow(
      new BadRequestException("Missing Twitch EventSub headers."),
    );
  });

  it("should throw BadRequestException if secret is not configured", () => {
    jest.spyOn(configService, "get").mockReturnValue(undefined);
    const context = mockExecutionContext({
      headers: {
        "twitch-eventsub-message-id": "1",
        "twitch-eventsub-message-timestamp": "2",
        "twitch-eventsub-message-signature": "3",
      },
    });
    expect(() => guard.canActivate(context)).toThrow(
      new BadRequestException("Webhook secret not configured."),
    );
  });

  it("should return true for a valid signature", () => {
    const secret = "my-secret";
    const payload = '{"some":"payload"}';
    const messageId = "msg-id";
    const timestamp = "2024-01-01T00:00:00Z";
    const message = messageId + timestamp + payload;
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(message)
      .digest("hex");
    const signature = `sha256=${hmac}`;

    jest.spyOn(configService, "get").mockReturnValue(secret);

    const context = mockExecutionContext({
      headers: {
        "twitch-eventsub-message-id": messageId,
        "twitch-eventsub-message-timestamp": timestamp,
        "twitch-eventsub-message-signature": signature,
      },
      rawBody: Buffer.from(payload),
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Twitch webhook signature validated successfully.",
    );
  });

  it("should throw BadRequestException for an invalid signature", () => {
    const secret = "my-secret";
    const payload = '{"some":"payload"}';
    const messageId = "msg-id";
    const timestamp = "2024-01-01T00:00:00Z";

    jest.spyOn(configService, "get").mockReturnValue(secret);

    const context = mockExecutionContext({
      headers: {
        "twitch-eventsub-message-id": messageId,
        "twitch-eventsub-message-timestamp": timestamp,
        "twitch-eventsub-message-signature": "sha256=invalid",
      },
      rawBody: Buffer.from(payload),
    });

    expect(() => guard.canActivate(context)).toThrow(
      new BadRequestException("Invalid Twitch signature."),
    );
  });
});
