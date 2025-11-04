import { HttpStatus } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import type { ValidatedUser } from "../auth.strategy";
import type { AuthenticatedRequest } from "../auth.type";
import { GmailController } from "./gmail.controller";
import type { GmailNotificationPayload } from "./gmail.service";
import { GmailService } from "./gmail.service";

const mockGmailService = {
  handleNotification: jest.fn(),
  startWatch: jest.fn(),
};
const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
const mockRes = {
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
};

describe("GmailController", () => {
  let controller: GmailController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GmailController],
      providers: [
        { provide: GmailService, useValue: mockGmailService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<GmailController>(GmailController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("pushWebhook", () => {
    it("should process a valid webhook", async () => {
      const payload: GmailNotificationPayload = {
        emailAddress: "test@example.com",
        historyId: "12345",
      };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        "base64",
      );
      const body = {
        message: { data: encodedPayload, messageId: "1", publishTime: "1" },
        subscription: "sub",
      };

      await controller.pushWebhook(body, mockRes as unknown as Response);

      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.NO_CONTENT);
      expect(mockRes.send).toHaveBeenCalled();
      expect(mockGmailService.handleNotification).toHaveBeenCalledWith(payload);
    });

    it("should ignore webhooks with no message data", async () => {
      const body = {
        message: { messageId: "1", publishTime: "1" },
        subscription: "sub",
      };
      await controller.pushWebhook(body, mockRes as unknown as Response);
      expect(mockGmailService.handleNotification).not.toHaveBeenCalled();
    });

    it("should handle errors during processing", async () => {
      const payload: GmailNotificationPayload = {
        emailAddress: "test@example.com",
        historyId: "12345",
      };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
        "base64",
      );
      const body = {
        message: { data: encodedPayload, messageId: "1", publishTime: "1" },
        subscription: "sub",
      };
      const error = new Error("Test Error");
      mockGmailService.handleNotification.mockRejectedValue(error);

      await controller.pushWebhook(body, mockRes as unknown as Response);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error processing Gmail webhook",
        error.stack,
      );
    });
  });

  describe("startWatch", () => {
    it("should call startWatch on the service with the user from request", async () => {
      const mockUser: ValidatedUser = {
        id: 1,
        email: "test@test.com",
        username: "test",
        role: "USER" as const,
      };
      const req = { user: mockUser } as AuthenticatedRequest;
      const watchResponse = { historyId: "12345" };
      mockGmailService.startWatch.mockResolvedValue(watchResponse);

      const result = await controller.startWatch(req);

      expect(mockGmailService.startWatch).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(watchResponse);
    });
  });
});
