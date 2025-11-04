import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import type { OAuth2Client } from "google-auth-library";
import { type gmail_v1, google } from "googleapis";

import { CustomLogger } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SendMailReactionDto } from "../../reactions/dto/reaction-data.dto";
import { TriggerService } from "../../reactions/trigger.service";
import { formatMessage } from "../../utils/format-message";

export interface GmailNotificationPayload {
  historyId: string | number;
  emailAddress: string;
}

@Injectable()
export class GmailService {
  private readonly processingUsers = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private triggerService: TriggerService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(GmailService.name);
  }

  async startWatch(user: {
    id: number;
    email: string;
  }): Promise<gmail_v1.Schema$WatchResponse> {
    const googleService = await this.prisma.service.findUnique({
      where: { name: "google" },
    });
    if (!googleService) {
      this.logger.error("Google service not found in DB");
      throw new NotFoundException("Google service not found in database");
    }

    const connection = await this.prisma.serviceConnection.findFirst({
      where: { userId: user.id, serviceId: googleService.id },
    });
    if (!connection) {
      this.logger.warn(
        `No Google connection for user ${user.id.toString()}. Cannot start watch.`,
      );
      throw new UnauthorizedException(
        `User ${user.email} has no Google connection.`,
      );
    }

    const webhookState = connection.webhookState as {
      expiration?: string;
      lastHistoryId?: string;
    } | null;
    const expiration = webhookState?.expiration
      ? parseInt(webhookState.expiration, 10)
      : 0;

    if (expiration > Date.now()) {
      this.logger.log(
        `Watch is still active for ${
          connection.serviceUserIdentity
        }. Expires at ${new Date(expiration).toISOString()}`,
      );
      return {
        historyId: webhookState?.lastHistoryId,
        expiration: webhookState?.expiration,
      };
    }

    this.logger.log(
      `Watch expired or not found for ${connection.serviceUserIdentity}. Creating/renewing...`,
    );

    const auth = await this.getAuthByUserId(connection.userId);
    const gmail = google.gmail({ version: "v1", auth });

    const topicName = this.configService.get<string>("GMAIL_PUBSUB_TOPIC");
    if (!topicName) {
      this.logger.error("GMAIL_PUBSUB_TOPIC not configured.");
      throw new ServiceUnavailableException("Gmail watch is not configured.");
    }

    const reqBody: gmail_v1.Schema$WatchRequest = {
      labelIds: ["INBOX"],
      topicName: topicName,
    };

    const resp = await gmail.users.watch({
      userId: "me",
      requestBody: reqBody,
    });

    this.logger.log(
      `Watch created for ${connection.serviceUserIdentity}: HistoryID=${
        resp.data.historyId ?? ""
      }, Expiration=${resp.data.expiration ?? ""}`,
    );

    if (resp.data.historyId && resp.data.expiration) {
      await this.prisma.serviceConnection.update({
        where: { id: connection.id },
        data: {
          webhookState: {
            lastHistoryId: resp.data.historyId,
            expiration: resp.data.expiration,
          },
        },
      });
      this.logger.log(`Updated watch state for user ${user.id.toString()}`);
    }

    return resp.data;
  }

  async handleNotification(payload: GmailNotificationPayload): Promise<void> {
    const { emailAddress } = payload;
    if (this.processingUsers.has(emailAddress)) {
      this.logger.debug(
        `Notification for ${emailAddress} is already being processed. Skipping.`,
      );
      return;
    }

    this.processingUsers.add(emailAddress);
    try {
      const historyId = String(payload.historyId);
      this.logger.log(
        `Handling Gmail notification for ${emailAddress}, historyId=${historyId}`,
      );

      const connection = await this.prisma.serviceConnection.findFirst({
        where: {
          serviceUserIdentity: emailAddress,
          service: { name: "google" },
        },
      });

      if (!connection) {
        this.logger.warn(
          `No Google connection for identity ${emailAddress}, ignoring notification.`,
        );
        return;
      }

      const auth = await this.getAuthByUserId(connection.userId);
      const gmail = google.gmail({ version: "v1", auth });

      const lastHistoryId = (
        connection.webhookState as Prisma.JsonObject | null
      )?.["lastHistoryId"];

      if (typeof lastHistoryId !== "string") {
        this.logger.warn(
          `No lastHistoryId for ${emailAddress}, updating and skipping.`,
        );
        await this.prisma.serviceConnection.update({
          where: { id: connection.id },
          data: { webhookState: { lastHistoryId: historyId } },
        });
        return;
      }

      const historyResp = await gmail.users.history.list({
        userId: "me",
        startHistoryId: lastHistoryId,
      });

      if (historyResp.data.history) {
        for (const h of historyResp.data.history) {
          if (h.messagesAdded) {
            for (const msgAdd of h.messagesAdded) {
              if (!msgAdd.message || !msgAdd.message.id) continue;
              const msgId = msgAdd.message.id;
              this.logger.log(`New mail for ${emailAddress}: ${msgId}`);
              const msg = await gmail.users.messages.get({
                userId: "me",
                id: msgId,
              });
              if (!msg.data.labelIds || !msg.data.labelIds.includes("INBOX")) {
                this.logger.debug(
                  `Message ${msgId} not in INBOX, skipping trigger.`,
                );
                continue;
              }

              const headers = msg.data.payload?.headers || [];
              const fromHeader = headers.find((h) => h.name === "From");
              const subjectHeader = headers.find((h) => h.name === "Subject");

              const triggerPayload = {
                from: fromHeader?.value ?? "unknown",
                subject: subjectHeader?.value ?? "(no subject)",
                snippet: msg.data.snippet,
                id: msg.data.id,
              };

              this.logger.log(`Triggering 'mail_received' for ${emailAddress}`);
              await this.triggerService.handleTrigger(
                "google",
                "mail_received",
                triggerPayload,
                connection.serviceUserIdentity,
              );
            }
          }
        }
      }

      await this.prisma.serviceConnection.update({
        where: { id: connection.id },
        data: {
          webhookState: {
            lastHistoryId: historyId,
          },
        },
      });
    } finally {
      this.processingUsers.delete(emailAddress);
    }
  }

  async sendMailReaction(
    userId: number,
    payload: Record<string, unknown>,
    reactionData: Prisma.JsonValue,
  ): Promise<void> {
    const reactionDto = plainToInstance(SendMailReactionDto, reactionData);
    const errors = await validate(reactionDto);

    if (errors.length > 0) {
      this.logger.warn(
        `Invalid send_mail data for user ${userId.toString()}: ${errors.toString()}`,
      );
      return;
    }
    const { to, subject, message } = reactionDto;

    const connection = await this.prisma.serviceConnection.findFirst({
      where: { userId, service: { name: "google" } },
    });

    if (!connection) {
      this.logger.warn(
        `User ${userId.toString()} has no Google connection for 'send_mail' reaction.`,
      );
      return;
    }

    const finalSubject = formatMessage(subject, payload);
    const body = formatMessage(message, payload);

    await this.sendMail(
      connection.userId,
      connection.serviceUserIdentity,
      to,
      finalSubject,
      body,
    );
  }

  private async getAuthByUserId(userId: number): Promise<OAuth2Client> {
    const googleService = await this.prisma.service.findUnique({
      where: { name: "google" },
    });
    if (!googleService) {
      this.logger.error("Google service not found in DB");
      throw new NotFoundException("Google service not found in database");
    }

    const connection = await this.prisma.serviceConnection.findFirst({
      where: {
        serviceId: googleService.id,
        userId: userId,
      },
    });

    if (!connection?.refreshToken) {
      this.logger.warn(
        `No Google connection/refresh token for user ${userId.toString()}.`,
      );
      throw new UnauthorizedException(
        `User ${userId.toString()} has no Google connection or refresh token.`,
      );
    }

    const oAuth2Client = new google.auth.OAuth2(
      this.configService.get<string>("CLIENT_ID_GOOGLE"),
      this.configService.get<string>("CLIENT_SECRET_GOOGLE"),
      `${this.configService.getOrThrow<string>(
        "BACKEND_URL",
      )}/auth/google/callback`,
    );

    oAuth2Client.setCredentials({
      refresh_token: connection.refreshToken,
    });

    return oAuth2Client;
  }

  private makeRawMessage(
    fromIdentity: string,
    to: string,
    subject: string,
    body: string,
  ): string {
    const message =
      `From: ${fromIdentity}\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${subject}\r\n` +
      `Content-Type: text/plain; charset="UTF-8"\r\n` +
      `\r\n` +
      body;

    return Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  async sendMail(
    userId: number,
    fromIdentity: string,
    to: string,
    subject: string,
    body: string = "",
  ): Promise<gmail_v1.Schema$Message> {
    try {
      this.logger.log(`Sending mail from ${fromIdentity} to ${to}`);
      const auth = await this.getAuthByUserId(userId);
      const gmail = google.gmail({ version: "v1", auth });
      const raw = this.makeRawMessage(fromIdentity, to, subject, body);

      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });

      const messageId = res.data.id ?? "";
      this.logger.log(`Mail sent with ID ${messageId}`);
      return res.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send mail from ${fromIdentity}: ${message}`,
        stack,
      );
      throw error;
    }
  }
}
