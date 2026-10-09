import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { EVENT_TYPES } from "@invitation/shared";

const RSVP_STATUSES = ["ATTENDING", "DECLINED", "MAYBE"] as const;
const EVENT_TYPE_LIST = EVENT_TYPES as unknown as string[];

export class CreateInvitationDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  templateId?: string;

  @IsOptional()
  @IsIn(EVENT_TYPE_LIST)
  eventType?: (typeof EVENT_TYPES)[number];
}

export class UpdateInvitationDto {
  @IsOptional()
  @IsIn(EVENT_TYPE_LIST)
  eventType?: (typeof EVENT_TYPES)[number];

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  rsvpFields?: unknown[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;
}

export class SubmitRsvpDto {
  @IsIn(RSVP_STATUSES as unknown as string[])
  status: (typeof RSVP_STATUSES)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  guestName: string;

  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;
}
