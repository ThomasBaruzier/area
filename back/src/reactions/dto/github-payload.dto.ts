import { Type } from "class-transformer";
import {
  IsArray,
  IsDefined,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

class OwnerDto {
  @IsString()
  login: string;
}

class RepositoryDto {
  @IsString()
  name: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => OwnerDto)
  owner: OwnerDto;
}

class LabelDto {
  @IsString()
  name: string;
}

class IssueDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabelDto)
  @IsOptional()
  labels?: LabelDto[];
}

export class GithubPushPayloadDto {
  @IsString()
  ref: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => RepositoryDto)
  repository: RepositoryDto;
}

export class GithubIssuePayloadDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => RepositoryDto)
  repository: RepositoryDto;

  @IsObject()
  @ValidateNested()
  @Type(() => IssueDto)
  @IsOptional()
  issue?: IssueDto;
}

export class GithubPullRequestPayloadDto {
  @IsString()
  action: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => RepositoryDto)
  repository: RepositoryDto;
}
