import { Prisma } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  ValidateNested,
} from "class-validator";

class ActionDto {
  @IsNumber()
  serviceId: number;

  @IsNumber()
  actionId: number;

  @IsObject()
  actionBody?: Prisma.JsonValue;
}

class ReactionDto {
  @IsNumber()
  serviceId: number;

  @IsNumber()
  reactionId: number;

  @IsObject()
  @IsOptional()
  reactionBody?: Prisma.JsonValue;
}

export class CreateWorkflowDto {
  @IsOptional()
  @IsBoolean()
  toggle?: boolean;

  @ValidateNested()
  @Type(() => ActionDto)
  action: ActionDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReactionDto)
  reactions: ReactionDto[];
}
