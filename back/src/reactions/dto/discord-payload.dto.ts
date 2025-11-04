import { Type } from "class-transformer";
import { IsObject, IsString, ValidateNested } from "class-validator";

class AuthorDto {
  @IsString()
  id: string;

  @IsString()
  username: string;
}

export class DiscordMessagePayloadDto {
  @IsString()
  channelId: string;

  @IsString()
  content: string;

  @IsObject()
  @ValidateNested()
  @Type(() => AuthorDto)
  author: AuthorDto;
}
