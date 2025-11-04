import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export interface MicrosoftGraphNotificationBody {
  value: MicrosoftGraphNotification[];
}

export interface MicrosoftGraphNotification {
  subscriptionId: string;
  changeType: "created" | "updated" | "deleted";
  tenantId?: string;
  clientState?: string;
  resource: string;
  subscriptionExpirationDateTime?: string;
  resourceData: MicrosoftGraphResourceData;
}

export interface MicrosoftGraphResourceData {
  "@odata.type": string;
  "@odata.id"?: string;
  id: string;
  subject?: string;
  from?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients?: {
    emailAddress: {
      name: string;
      address: string;
    };
  }[];
  receivedDateTime?: string;
  bodyPreview?: string;
  body?: {
    content: string;
    contentType: string;
  };
  isRead?: boolean;
  parentFolderId?: string;
}

export interface MicrosoftGraphSubscriptionResponse {
  id: string;
  resource: string;
  changeType: string;
  notificationUrl: string;
  expirationDateTime: string;
  clientState?: string;
}

export class SendMicrosoftMailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
