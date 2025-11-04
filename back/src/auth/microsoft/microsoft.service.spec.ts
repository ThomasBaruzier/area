import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { ServiceConnection, Workflow } from "@prisma/client";
import { AxiosHeaders, type AxiosResponse } from "axios";
import type { Request, Response } from "express";
import { of, throwError } from "rxjs";

import { CustomLogger } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TriggerService } from "../../reactions/trigger.service";
import { MicrosoftService } from "./microsoft.service";
import type {
  MicrosoftGraphNotification,
  MicrosoftGraphNotificationBody,
  MicrosoftGraphResourceData,
} from "./microsoft.types";

describe("MicrosoftService", () => {
  let service: MicrosoftService;
  let prismaService: PrismaService;
  let httpService: HttpService;
  let triggerService: TriggerService;

  const mockPrismaService = {
    serviceConnection: {
      findFirst: jest.fn(),
    },
    workflow: {
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn().mockReturnValue("http://proxy.url"),
    getOrThrow: jest.fn().mockReturnValue("http://backend.url"),
  };
  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  const mockTriggerService = {
    handleTrigger: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
        { provide: TriggerService, useValue: mockTriggerService },
      ],
    }).compile();
    service = module.get<MicrosoftService>(MicrosoftService);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
    triggerService = module.get<TriggerService>(TriggerService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("startWatch", () => {
    it("should throw if no service connection is found", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(null);
      await expect(service.startWatch(1, 1)).rejects.toThrow(
        "No Microsoft service connection for user: 1",
      );
    });

    it("should create a subscription and update the workflow", async () => {
      const mockConnection: ServiceConnection = {
        token: "test-token",
      } as ServiceConnection;
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      const mockResponse: AxiosResponse = {
        data: { id: "subscription-id" },
        status: 201,
        statusText: "Created",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      (httpService.post as jest.Mock).mockReturnValue(of(mockResponse));

      await service.startWatch(1, 123);

      expect(httpService.post).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/subscriptions",
        expect.any(Object),
        expect.any(Object),
      );
      expect(prismaService.workflow.update).toHaveBeenCalledWith({
        where: { id: 123 },
        data: { identifier: "subscription-id" },
      });
    });

    it("should throw on API failure", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue({ token: "token" });
      (httpService.post as jest.Mock).mockReturnValue(
        throwError(() => new Error("API Error")),
      );
      await expect(service.startWatch(1, 1)).rejects.toThrow(
        "Microsoft mail subscription failed",
      );
    });
  });

  describe("mailReceived", () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    it("should handle validation token request", async () => {
      const mockReq = {
        query: { validationToken: "test-token" },
      } as unknown as Request;
      await service.mailReceived(
        mockReq,
        mockRes,
        {} as MicrosoftGraphNotificationBody,
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith("test-token");
    });

    it("should process notifications and trigger workflows", async () => {
      const mockReq = { query: {} } as unknown as Request;
      const mockBody: MicrosoftGraphNotificationBody = {
        value: [
          {
            subscriptionId: "sub1",
            resourceData: { id: "msg1" },
          } as unknown as MicrosoftGraphNotification,
        ],
      };
      const mockWorkflow: Workflow = {
        id: 123,
        userId: 1,
        actionJson: {},
      } as Workflow;
      const mockConnection = { token: "token", serviceUserIdentity: "user@ms" };
      const mockEmailDetails: MicrosoftGraphResourceData = {
        id: "msg1",
        from: { emailAddress: { name: "Test", address: "test@from.com" } },
        subject: "Subject",
      } as MicrosoftGraphResourceData;

      (prismaService.workflow.findFirst as jest.Mock).mockResolvedValue(
        mockWorkflow,
      );
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      (httpService.get as jest.Mock).mockReturnValue(
        of({ data: mockEmailDetails }),
      );

      await service.mailReceived(mockReq, mockRes, mockBody);

      expect(triggerService.handleTrigger).toHaveBeenCalledWith(
        "microsoft",
        "mail_received",
        expect.any(Object),
        "user@ms",
      );
      expect(mockRes.status).toHaveBeenCalledWith(202);
    });

    it("should gracefully handle notifications with an empty value array", async () => {
      const mockReq = { query: {} } as unknown as Request;
      const mockBody: MicrosoftGraphNotificationBody = {
        value: [],
      };

      await service.mailReceived(mockReq, mockRes, mockBody);

      expect(triggerService.handleTrigger).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(202);
    });

    it("should log an error for unknown subscription IDs", async () => {
      const mockReq = { query: {} } as unknown as Request;
      const mockBody: MicrosoftGraphNotificationBody = {
        value: [
          {
            subscriptionId: "unknown-sub",
          } as unknown as MicrosoftGraphNotification,
        ],
      };
      (prismaService.workflow.findFirst as jest.Mock).mockResolvedValue(null);

      await service.mailReceived(mockReq, mockRes, mockBody);

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Microsoft Graph notification received for unknown subscription ID: unknown-sub",
      );
      expect(triggerService.handleTrigger).not.toHaveBeenCalled();
    });

    describe("with email filters", () => {
      const setupFilterTest = (
        actionJson: Record<string, unknown>,
        emailDetails: Partial<MicrosoftGraphResourceData>,
      ) => {
        const mockReq = { query: {} } as unknown as Request;
        const mockBody: MicrosoftGraphNotificationBody = {
          value: [
            {
              subscriptionId: "sub1",
              resourceData: { id: "msg1" },
            } as MicrosoftGraphNotification,
          ],
        };
        const mockWorkflow = {
          id: 123,
          userId: 1,
          actionJson,
        } as unknown as Workflow;
        const mockConnection = {
          token: "token",
          serviceUserIdentity: "user@ms",
        };

        (prismaService.workflow.findFirst as jest.Mock).mockResolvedValue(
          mockWorkflow,
        );
        (
          prismaService.serviceConnection.findFirst as jest.Mock
        ).mockResolvedValue(mockConnection);
        (httpService.get as jest.Mock).mockReturnValue(
          of({ data: emailDetails }),
        );
        return service.mailReceived(mockReq, mockRes, mockBody);
      };

      it("should trigger when 'from' filter matches", async () => {
        await setupFilterTest(
          { from: "test" },
          {
            from: {
              emailAddress: { name: "Test", address: "test@example.com" },
            },
          },
        );
        expect(triggerService.handleTrigger).toHaveBeenCalled();
      });

      it("should not trigger when 'from' filter does not match", async () => {
        await setupFilterTest(
          { from: "prod" },
          {
            from: {
              emailAddress: { name: "Test", address: "test@example.com" },
            },
          },
        );
        expect(triggerService.handleTrigger).not.toHaveBeenCalled();
      });

      it("should trigger when 'subject' filter matches", async () => {
        await setupFilterTest(
          { subject: "urgent" },
          { subject: "URGENT: Alert" },
        );
        expect(triggerService.handleTrigger).toHaveBeenCalled();
      });

      it("should not trigger when 'subject' filter does not match", async () => {
        await setupFilterTest(
          { subject: "urgent" },
          { subject: "Fwd: Meeting" },
        );
        expect(triggerService.handleTrigger).not.toHaveBeenCalled();
      });

      it("should trigger only when all filters match", async () => {
        await setupFilterTest(
          { from: "test", subject: "urgent" },
          {
            from: {
              emailAddress: { name: "Test", address: "test@example.com" },
            },
            subject: "URGENT: Alert",
          },
        );
        expect(triggerService.handleTrigger).toHaveBeenCalled();
      });

      it("should not trigger if one of multiple filters fails", async () => {
        await setupFilterTest(
          { from: "test", subject: "urgent" },
          {
            from: {
              emailAddress: { name: "Test", address: "test@example.com" },
            },
            subject: "Meeting",
          },
        );
        expect(triggerService.handleTrigger).not.toHaveBeenCalled();
      });
    });
  });

  describe("sendMailReaction", () => {
    it("should log error if no service connection is found", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(null);
      await service.sendMailReaction(
        1,
        {},
        { to: "test@example.com", subject: "Test", message: "Test" },
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "has no Microsoft connection for 'send_mail' reaction",
        ),
      );
    });

    it("should warn if reaction data is invalid", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue({ token: "token" });
      await service.sendMailReaction(1, {}, { subject: "Sub" });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid send_mail data for user 1"),
      );
    });

    it("should call Graph API to send mail on success", async () => {
      const mockConnection = {
        userId: 1,
        token: "token",
        serviceUserIdentity: "test@example.com",
      };
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      (httpService.post as jest.Mock).mockReturnValue(of({}));
      const reactionData = {
        to: "test@example.com",
        subject: "Subject",
        message: "Message body",
      };

      await service.sendMailReaction(1, {}, reactionData);

      expect(httpService.post).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        expect.any(Object),
        expect.any(Object),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Successfully sent Microsoft mail"),
      );
    });
  });
});
