import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Request, Response } from "express";
import { firstValueFrom } from "rxjs";
import { CustomLogger } from "src/logger/logger.service";
import { PrismaService } from "src/prisma/prisma.service";
import { TriggerService } from "src/reactions/trigger.service";
import { formatMessage } from "src/utils/format-message";

import {
  MicrosoftGraphNotificationBody,
  MicrosoftGraphResourceData,
  MicrosoftGraphSubscriptionResponse,
  SendMicrosoftMailDto,
} from "./microsoft.types";

@Injectable()
export class MicrosoftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLogger,
    private readonly configService: ConfigService,
    private readonly triggerService: TriggerService,
    private readonly httpService: HttpService,
  ) {
    this.logger.setContext(MicrosoftService.name);
  }

  private getWebhookUrl(): string {
    const backendUrl = this.configService.getOrThrow<string>("BACKEND_URL");
    return `${backendUrl}/auth/microsoft/outlook`;
  }

  async startWatch(userId: number, workflowId: number): Promise<number> {
    const serviceConnection = await this.prisma.serviceConnection.findFirst({
      where: {
        service: {
          name: "microsoft",
        },
        userId: userId,
      },
    });

    if (!serviceConnection) {
      throw new Error(
        `No Microsoft service connection for user: ${userId.toString()}`,
      );
    }
    await this.startWatchMail(serviceConnection.token, workflowId);
    return userId;
  }

  private async startWatchMail(accessToken: string, workflowId: number) {
    const notificationUrl = this.getWebhookUrl();
    const expirationDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const body = {
      changeType: "created",
      notificationUrl: notificationUrl,
      resource: "/me/mailFolders('Inbox')/messages",
      expirationDateTime: expirationDate,
      clientState: "secretClientValue",
    };

    this.logger.log(
      `Creating Microsoft Graph subscription for workflow ${workflowId.toString()}`,
    );
    this.logger.verbose({
      message: "Subscription request body",
      body,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<MicrosoftGraphSubscriptionResponse>(
          "https://graph.microsoft.com/v1.0/subscriptions",
          body,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      const subscriptionId: string = response.data.id;
      this.logger.log(
        `Successfully created Microsoft Graph subscription ${subscriptionId} for workflow ${workflowId.toString()}`,
      );
      this.logger.verbose({
        message: "Microsoft mail subscription created",
        data: response.data,
      });

      await this.prisma.workflow.update({
        where: { id: workflowId },
        data: { identifier: subscriptionId },
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to create Microsoft mail subscription: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new Error("Microsoft mail subscription failed");
    }
  }

  async mailReceived(
    req: Request,
    res: Response,
    body: MicrosoftGraphNotificationBody,
  ): Promise<Response> {
    const validationToken = req.query["validationToken"] as string;
    if (validationToken) {
      this.logger.log("Responding to Microsoft Graph validation token.");
      return res.status(200).type("text/plain").send(validationToken);
    }

    if (!Array.isArray(body.value) || body.value.length === 0) {
      this.logger.warn(
        "Received Microsoft Graph notification with invalid or empty body.",
      );
      this.logger.verbose({
        message: "Invalid notification body received",
        body,
      });
      return res.status(202).send();
    }

    this.logger.log(
      `Received ${body.value.length.toString()} Microsoft Graph notification(s).`,
    );
    this.logger.verbose({
      message: "Full Microsoft Graph notification body",
      body,
    });

    for (const notification of body.value) {
      const { subscriptionId, resource, resourceData } = notification;
      this.logger.debug(
        `Processing notification for subscription ${subscriptionId} on resource ${resource}`,
      );

      const workflow = await this.prisma.workflow.findFirst({
        where: { identifier: subscriptionId },
        include: {
          action: {
            include: {
              service: true,
            },
          },
        },
      });

      if (!workflow) {
        this.logger.error(
          `Microsoft Graph notification received for unknown subscription ID: ${subscriptionId}`,
        );
        continue;
      }

      const serviceConnection = await this.prisma.serviceConnection.findFirst({
        where: {
          userId: workflow.userId,
          service: { name: "microsoft" },
        },
      });

      if (!serviceConnection || !serviceConnection.token) {
        this.logger.error(
          `No Microsoft token found for workflow ${workflow.id.toString()}`,
        );
        continue;
      }

      try {
        const messageId = resourceData.id;
        if (!messageId) {
          this.logger.warn(
            `No message ID found in notification for workflow ${workflow.id.toString()}`,
          );
          continue;
        }

        const emailDetails = await this.fetchEmailDetails(
          serviceConnection.token,
          messageId,
        );

        if (!emailDetails) {
          this.logger.warn(
            `Failed to fetch email details for message ${messageId}`,
          );
          continue;
        }

        const fromAddress =
          emailDetails.from?.emailAddress.address || "unknown";
        const subject = emailDetails.subject || "(no subject)";
        const bodyPreview = emailDetails.bodyPreview || "";

        this.logger.log(
          `New Microsoft mail for workflow ${workflow.id.toString()}: from=${fromAddress}, subject=${subject}`,
        );

        const actionBody = workflow.actionJson;
        const shouldTrigger = this.checkEmailFilters(emailDetails, actionBody);

        if (!shouldTrigger) {
          this.logger.debug(
            `Email ${messageId} does not match filters for workflow ${workflow.id.toString()}, skipping trigger.`,
          );
          continue;
        }

        const triggerPayload = {
          from: fromAddress,
          subject: subject,
          snippet: bodyPreview,
          id: messageId,
          to:
            emailDetails.toRecipients
              ?.map(
                (r: { emailAddress?: { address?: string } }) =>
                  r.emailAddress?.address,
              )
              .filter(Boolean) || [],
          receivedDateTime: emailDetails.receivedDateTime,
        };

        this.logger.log(
          `Triggering 'mail_received' for workflow ${workflow.id.toString()}`,
        );
        await this.triggerService.handleTrigger(
          "microsoft",
          "mail_received",
          triggerPayload,
          serviceConnection.serviceUserIdentity,
        );
      } catch (error) {
        this.logger.error(
          `Error processing Microsoft mail notification for workflow ${workflow.id.toString()}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        continue;
      }
    }
    return res.status(202).send();
  }

  private async fetchEmailDetails(
    accessToken: string,
    messageId: string,
  ): Promise<MicrosoftGraphResourceData | null> {
    try {
      this.logger.debug(`Fetching email details for message ${messageId}`);

      const response = await firstValueFrom(
        this.httpService.get<MicrosoftGraphResourceData>(
          `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      this.logger.debug(
        `Successfully fetched email details for message ${messageId}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch email details for message ${messageId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private checkEmailFilters(
    email: MicrosoftGraphResourceData,
    actionBody: Prisma.JsonValue,
  ): boolean {
    if (
      !actionBody ||
      typeof actionBody !== "object" ||
      Array.isArray(actionBody) ||
      Object.keys(actionBody).length === 0
    ) {
      return true;
    }

    const fromFilter =
      "from" in actionBody && typeof actionBody.from === "string"
        ? actionBody.from
        : null;
    const subjectFilter =
      "subject" in actionBody && typeof actionBody.subject === "string"
        ? actionBody.subject
        : null;

    if (fromFilter) {
      const fromAddress = email.from?.emailAddress.address.toLowerCase() ?? "";
      const fromName = email.from?.emailAddress.name.toLowerCase() ?? "";
      const filterLower = fromFilter.toLowerCase();

      if (
        !fromAddress.includes(filterLower) &&
        !fromName.includes(filterLower)
      ) {
        this.logger.debug(
          `Email from ${fromAddress} (${fromName}) does not match from filter: ${fromFilter}`,
        );
        return false;
      }
    }

    if (subjectFilter) {
      const subject = email.subject?.toLowerCase() ?? "";
      const filterLower = subjectFilter.toLowerCase();

      if (!subject.includes(filterLower)) {
        this.logger.debug(
          `Email subject "${
            email.subject ?? ""
          }" does not match subject filter: ${subjectFilter}`,
        );
        return false;
      }
    }

    return true;
  }

  async sendMailReaction(
    userId: number,
    payload: Record<string, unknown>,
    reactionData: Prisma.JsonValue,
  ): Promise<void> {
    const reactionDto = plainToInstance(SendMicrosoftMailDto, reactionData);
    const errors = await validate(reactionDto);

    if (errors.length > 0) {
      this.logger.warn(
        `Invalid send_mail data for user ${userId.toString()}: ${errors.toString()}`,
      );
      return;
    }
    const { to, subject, message } = reactionDto;

    const serviceConnection = await this.prisma.serviceConnection.findFirst({
      where: { userId, service: { name: "microsoft" } },
    });

    if (!serviceConnection || !serviceConnection.token) {
      this.logger.warn(
        `User ${userId.toString()} has no Microsoft connection for 'send_mail' reaction.`,
      );
      return;
    }

    const finalSubject = formatMessage(subject, payload);
    const body = formatMessage(message, payload);

    await this.sendMail(
      serviceConnection.userId,
      serviceConnection.serviceUserIdentity,
      to,
      finalSubject,
      body,
    );
  }

  async sendMail(
    userId: number,
    fromIdentity: string,
    to: string,
    subject: string,
    body: string = "",
  ): Promise<void> {
    try {
      this.logger.log(`Sending Microsoft mail from ${fromIdentity} to ${to}`);

      const serviceConnection = await this.prisma.serviceConnection.findFirst({
        where: { userId, service: { name: "microsoft" } },
      });

      if (!serviceConnection || !serviceConnection.token) {
        throw new Error(
          `No Microsoft token found for user ${userId.toString()}`,
        );
      }

      const message = {
        message: {
          subject: subject,
          body: {
            contentType: "HTML",
            content: body.replace(/\n/g, "<br>"),
          },
          toRecipients: [
            {
              emailAddress: { address: to },
            },
          ],
        },
        saveToSentItems: true,
      };

      await firstValueFrom(
        this.httpService.post(
          "https://graph.microsoft.com/v1.0/me/sendMail",
          message,
          {
            headers: {
              Authorization: `Bearer ${serviceConnection.token}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );

      this.logger.log(
        `Successfully sent Microsoft mail from ${fromIdentity} to ${to}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to send Microsoft mail from ${fromIdentity}: ${message}`,
        stack,
      );
      throw error;
    }
  }
}
