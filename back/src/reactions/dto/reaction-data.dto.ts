import { Type } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

/*
    GITHUB REACTION DTOs
*/

export class CreateIssueReactionDto {
  @IsString()
  @IsNotEmpty()
  owner: string;

  @IsString()
  @IsNotEmpty()
  repo: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;
}

export class CreateReleaseReactionDto {
  @IsString()
  @IsNotEmpty()
  owner: string;

  @IsString()
  @IsNotEmpty()
  repo: string;

  @IsString()
  @IsNotEmpty()
  tag_name: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  target_commitish?: string;
}

export class CreateCommentReactionDto {
  @IsString()
  @IsNotEmpty()
  owner: string;

  @IsString()
  @IsNotEmpty()
  repo: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  issue_number: number;

  @IsString()
  @IsNotEmpty()
  body: string;
}

/*
    MAIL REACTION DTOs
*/

export class SendMailReactionDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class SendChatReactionDto {
  @IsString()
  streamerName: string;

  @IsString()
  userName: string;

  @IsString()
  message: string;
}

export class CreatePlaylistDto {
  @IsString()
  owner: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  isPublic: string;
}

export class SetPlaybackVolumeDto {
  @IsString()
  volume: string;
}

/*
    DISCORD REACTION DTOs
*/
export class SendMessageDiscordDto {
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
