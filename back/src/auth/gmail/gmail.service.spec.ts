import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { OAuth2Client } from "google-auth-library";
import { type gmail_v1, google } from "googleapis";

import { CustomLogger } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { TriggerService } from "../../reactions/trigger.service";
import { GmailService } from "./gmail.service";

jest.mock("googleapis", () => ({
  google: {
    gmail: jest.fn(),
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
      })),
    },
  },
}));

type PrivateGmailService = {
  processingUsers: Set<string>;
  getAuthByUserId: (userId: number) => Promise<OAuth2Client>;
  makeRawMessage: (
    fromIdentity: string,
    to: string,
    subject: string,
    body: string,
  ) => string;
};

describe("GmailService", () => {
  let service: GmailService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let triggerService: TriggerService;
  let logger: CustomLogger;

  const mockPrismaService = {
    service: {
      findUnique: jest.fn(),
    },
    serviceConnection: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    workflow: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const mockTriggerService = {
    handleTrigger: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GmailService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TriggerService, useValue: mockTriggerService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<GmailService>(GmailService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    triggerService = module.get<TriggerService>(TriggerService);
    logger = module.get<CustomLogger>(CustomLogger);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("startWatch", () => {
    const mockUser = { id: 123, email: "test@example.com" };
    const mockGoogleService = { id: 1, name: "google" };
    const mockConnection = {
      id: 1,
      userId: 123,
      serviceId: 1,
      serviceUserIdentity: "test@example.com",
      refreshToken: "refresh_token",
      webhookState: null,
    };

    it("should throw NotFoundException if Google service not found", async () => {
      (prismaService.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.startWatch(mockUser)).rejects.toThrow(
        "Google service not found in database",
      );
      expect(logger.error).toHaveBeenCalledWith(
        "Google service not found in DB",
      );
    });

    it("should throw UnauthorizedException if no connection found", async () => {
      (prismaService.service.findUnique as jest.Mock).mockResolvedValue(
        mockGoogleService,
      );
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.startWatch(mockUser)).rejects.toThrow(
        `User ${mockUser.email} has no Google connection.`,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        "No Google connection for user 123. Cannot start watch.",
      );
    });

    it("should return existing watch if still active", async () => {
      const activeWebhookState = {
        expiration: (Date.now() + 1000000).toString(),
        lastHistoryId: "12345",
      };

      (prismaService.service.findUnique as jest.Mock).mockResolvedValue(
        mockGoogleService,
      );
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue({
        ...mockConnection,
        webhookState: activeWebhookState,
      });

      const result = await service.startWatch(mockUser);

      expect(result).toEqual({
        historyId: "12345",
        expiration: activeWebhookState.expiration,
      });
      expect(logger.log).toHaveBeenCalledWith(
        "Watch is still active for test@example.com. Expires at " +
          new Date(parseInt(activeWebhookState.expiration)).toISOString(),
      );
    });

    it("should create new watch if not configured", async () => {
      const mockGmail = {
        users: {
          watch: jest.fn().mockResolvedValue({
            data: {
              historyId: "new_history_id",
              expiration: "new_expiration",
            },
          }),
        },
      };

      (google.gmail as jest.Mock).mockReturnValue(mockGmail);
      (configService.get as jest.Mock).mockReturnValue(
        "projects/test/topics/gmail",
      );
      (prismaService.service.findUnique as jest.Mock).mockResolvedValue(
        mockGoogleService,
      );
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);

      const result = await service.startWatch(mockUser);

      expect(result).toEqual({
        historyId: "new_history_id",
        expiration: "new_expiration",
      });
      expect(mockGmail.users.watch).toHaveBeenCalledWith({
        userId: "me",
        requestBody: {
          labelIds: ["INBOX"],
          topicName: "projects/test/topics/gmail",
        },
      });
    });

    it("should throw ServiceUnavailableException if GMAIL_PUBSUB_TOPIC not configured", async () => {
      (configService.get as jest.Mock).mockReturnValue(null);
      (prismaService.service.findUnique as jest.Mock).mockResolvedValue(
        mockGoogleService,
      );
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);

      await expect(service.startWatch(mockUser)).rejects.toThrow(
        "Gmail watch is not configured.",
      );
      expect(logger.error).toHaveBeenCalledWith(
        "GMAIL_PUBSUB_TOPIC not configured.",
      );
    });
  });

  describe("handleNotification", () => {
    const mockPayload = {
      historyId: "12345",
      emailAddress: "test@example.com",
    };

    it("should skip if already processing", async () => {
      (service as unknown as PrivateGmailService).processingUsers.add(
        "test@example.com",
      );

      await service.handleNotification(mockPayload);

      expect(logger.debug).toHaveBeenCalledWith(
        "Notification for test@example.com is already being processed. Skipping.",
      );
    });

    it("should return early if no connection found", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(null);

      await service.handleNotification(mockPayload);

      expect(logger.warn).toHaveBeenCalledWith(
        "No Google connection for identity test@example.com, ignoring notification.",
      );
    });

    it("should update lastHistoryId if not found", async () => {
      const mockConnection = {
        id: 1,
        serviceUserIdentity: "test@example.com",
        webhookState: null,
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };

      jest
        .spyOn(service as unknown as PrivateGmailService, "getAuthByUserId")
        .mockResolvedValue(mockOAuth2Client as unknown as OAuth2Client);

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);

      await service.handleNotification(mockPayload);

      expect(prismaService.serviceConnection.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { webhookState: { lastHistoryId: "12345" } },
      });
    });

    it("should process mail notifications", async () => {
      const mockConnection = {
        id: 1,
        serviceUserIdentity: "test@example.com",
        webhookState: { lastHistoryId: "12340" },
      };

      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };
      const mockGmail = {
        users: {
          history: {
            list: jest.fn().mockResolvedValue({
              data: {
                history: [
                  {
                    messagesAdded: [
                      {
                        message: { id: "msg123" },
                      },
                    ],
                  },
                ],
              },
            }),
          },
          messages: {
            get: jest.fn().mockResolvedValue({
              data: {
                id: "msg123",
                snippet: "Test message",
                labelIds: ["INBOX"],
                payload: {
                  headers: [
                    { name: "From", value: "sender@example.com" },
                    { name: "Subject", value: "Test Subject" },
                  ],
                },
              },
            }),
          },
        },
      };

      (google.gmail as jest.Mock).mockReturnValue(mockGmail);
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      jest
        .spyOn(service as unknown as PrivateGmailService, "getAuthByUserId")
        .mockResolvedValue(mockOAuth2Client as unknown as OAuth2Client);

      await service.handleNotification(mockPayload);

      expect(triggerService.handleTrigger).toHaveBeenCalledWith(
        "google",
        "mail_received",
        {
          from: "sender@example.com",
          subject: "Test Subject",
          snippet: "Test message",
          id: "msg123",
        },
        "test@example.com",
      );
    });

    it("should use default subject and from if headers are missing", async () => {
      const mockConnection = {
        id: 1,
        webhookState: { lastHistoryId: "12340" },
        serviceUserIdentity: "test@example.com",
      };
      const mockGmail = {
        users: {
          history: {
            list: jest.fn().mockResolvedValue({
              data: {
                history: [{ messagesAdded: [{ message: { id: "msg123" } }] }],
              },
            }),
          },
          messages: {
            get: jest.fn().mockResolvedValue({
              data: {
                id: "msg123",
                snippet: "Test message",
                labelIds: ["INBOX"],
                payload: { headers: [] },
              },
            }),
          },
        },
      };
      (google.gmail as jest.Mock).mockReturnValue(mockGmail);
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      jest
        .spyOn(service as unknown as PrivateGmailService, "getAuthByUserId")
        .mockResolvedValue({} as OAuth2Client);

      await service.handleNotification(mockPayload);

      expect(triggerService.handleTrigger).toHaveBeenCalledWith(
        "google",
        "mail_received",
        expect.objectContaining({
          from: "unknown",
          subject: "(no subject)",
        }),
        "test@example.com",
      );
    });

    it("should not trigger for non-INBOX messages", async () => {
      const mockConnection = {
        id: 1,
        webhookState: { lastHistoryId: "12340" },
        serviceUserIdentity: "test@example.com",
      };
      const mockGmail = {
        users: {
          history: {
            list: jest.fn().mockResolvedValue({
              data: {
                history: [{ messagesAdded: [{ message: { id: "msg123" } }] }],
              },
            }),
          },
          messages: {
            get: jest.fn().mockResolvedValue({
              data: {
                id: "msg123",
                labelIds: ["SENT"],
                payload: { headers: [] },
              },
            }),
          },
        },
      };
      (google.gmail as jest.Mock).mockReturnValue(mockGmail);
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      jest
        .spyOn(service as unknown as PrivateGmailService, "getAuthByUserId")
        .mockResolvedValue({} as OAuth2Client);

      await service.handleNotification(mockPayload);

      expect(triggerService.handleTrigger).not.toHaveBeenCalled();
    });

    it("should handle multiple new messages in history", async () => {
      const mockConnection = {
        id: 1,
        webhookState: { lastHistoryId: "12340" },
        serviceUserIdentity: "test@example.com",
      };
      const mockGmail = {
        users: {
          history: {
            list: jest.fn().mockResolvedValue({
              data: {
                history: [
                  {
                    messagesAdded: [
                      { message: { id: "msg1" } },
                      { message: { id: "msg2" } },
                    ],
                  },
                ],
              },
            }),
          },
          messages: {
            get: jest
              .fn()
              .mockResolvedValueOnce({
                data: { id: "msg1", labelIds: ["INBOX"], payload: {} },
              })
              .mockResolvedValueOnce({
                data: { id: "msg2", labelIds: ["INBOX"], payload: {} },
              }),
          },
        },
      };
      (google.gmail as jest.Mock).mockReturnValue(mockGmail);
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      jest
        .spyOn(service as unknown as PrivateGmailService, "getAuthByUserId")
        .mockResolvedValue({} as OAuth2Client);

      await service.handleNotification(mockPayload);

      expect(triggerService.handleTrigger).toHaveBeenCalledTimes(2);
    });

    it("should handle empty history response", async () => {
      const mockConnection = {
        id: 1,
        webhookState: { lastHistoryId: "12340" },
        serviceUserIdentity: "test@example.com",
      };
      const mockGmail = {
        users: { history: { list: jest.fn().mockResolvedValue({ data: {} }) } },
      };
      (google.gmail as jest.Mock).mockReturnValue(mockGmail);
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      jest
        .spyOn(service as unknown as PrivateGmailService, "getAuthByUserId")
        .mockResolvedValue({} as OAuth2Client);

      await service.handleNotification(mockPayload);

      expect(triggerService.handleTrigger).not.toHaveBeenCalled();
    });
  });

  describe("sendMailReaction", () => {
    const userId = 123;
    const payload = {};
    const reactionData = {
      to: "recipient@example.com",
      subject: "Test Subject",
      message: "Test message",
    };

    it("should handle invalid reaction data", async () => {
      await service.sendMailReaction(userId, payload, { invalid: "data" });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid send_mail data for user 123"),
      );
    });

    it("should handle missing connection", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(null);

      await service.sendMailReaction(userId, payload, reactionData);

      expect(logger.warn).toHaveBeenCalledWith(
        "User 123 has no Google connection for 'send_mail' reaction.",
      );
    });

    it("should send mail with formatted content", async () => {
      const mockConnection = {
        userId,
        serviceUserIdentity: "sender@example.com",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      jest
        .spyOn(service, "sendMail")
        .mockResolvedValue({} as gmail_v1.Schema$Message);

      await service.sendMailReaction(userId, payload, reactionData);

      expect(service.sendMail).toHaveBeenCalledWith(
        userId,
        "sender@example.com",
        "recipient@example.com",
        "Test Subject",
        "Test message",
      );
    });
  });

  describe("sendMail", () => {
    it("should send mail successfully", async () => {
      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };
      const mockGmail = {
        users: {
          messages: {
            send: jest.fn().mockResolvedValue({
              data: { id: "message123" },
            }),
          },
        },
      };

      (google.gmail as jest.Mock).mockReturnValue(mockGmail);
      jest
        .spyOn(service as unknown as PrivateGmailService, "getAuthByUserId")
        .mockResolvedValue(mockOAuth2Client as unknown as OAuth2Client);

      const result = await service.sendMail(
        123,
        "sender@example.com",
        "recipient@example.com",
        "Test Subject",
        "Test message",
      );

      expect(result).toEqual({ id: "message123" });
      expect(logger.log).toHaveBeenCalledWith("Mail sent with ID message123");
    });

    it("should throw error if sending fails", async () => {
      const mockOAuth2Client = {
        setCredentials: jest.fn(),
      };
      const mockGmail = {
        users: {
          messages: {
            send: jest.fn().mockRejectedValue(new Error("Send failed")),
          },
        },
      };

      (google.gmail as jest.Mock).mockReturnValue(mockGmail);
      jest
        .spyOn(service as unknown as PrivateGmailService, "getAuthByUserId")
        .mockResolvedValue(mockOAuth2Client as unknown as OAuth2Client);

      await expect(
        service.sendMail(
          123,
          "sender@example.com",
          "recipient@example.com",
          "Test Subject",
          "Test message",
        ),
      ).rejects.toThrow("Send failed");
    });
  });

  describe("makeRawMessage", () => {
    it("should create properly formatted raw message", () => {
      const result = (service as unknown as PrivateGmailService).makeRawMessage(
        "sender@example.com",
        "recipient@example.com",
        "Test Subject",
        "Test message",
      );

      const decoded = Buffer.from(
        result.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString();
      expect(decoded).toContain("From: sender@example.com");
      expect(decoded).toContain("To: recipient@example.com");
      expect(decoded).toContain("Subject: Test Subject");
      expect(decoded).toContain("Test message");
    });
  });
});
