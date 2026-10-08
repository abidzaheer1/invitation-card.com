import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { EVENT_TYPES } from "@invitation/shared";

const RSVP_STATUSES = ["ATTENDING", "DECLINED", "MAYBE"] as const;

export class CreateInvitationDto {
  @IsIn(EVENT_TYPES as unknown as string[])
  eventType: (typeof EVENT_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  templateId?: string;
}

export class UpdateInvitationDto {
  @IsOptional()
  @IsIn(EVENT_TYPES as unknown as string[])
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
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug may only contain lowercase letters, numbers and single hyphens",
  })
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
