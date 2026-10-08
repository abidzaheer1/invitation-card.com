import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  createEmptyInvitation,
  DEFAULT_RSVP_FIELDS,
  type EventType,
  type PublicInvitation,
  type RsvpField,
} from "@invitation/shared";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInvitationDto, SubmitRsvpDto, UpdateInvitationDto } from "./invitations.dto";

const MAX_CONTENT_BYTES = 200_000;
const FIELD_TYPES = ["text", "email", "phone", "number", "select", "textarea"];

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "invitation";
}

function assertValidContent(content: Record<string, unknown>) {
  if (Buffer.byteLength(JSON.stringify(content)) > MAX_CONTENT_BYTES) {
    throw new BadRequestException("Invitation content is too large");
  }
  if (!Array.isArray(content.sections) || content.sections.length > 50) {
    throw new BadRequestException("content.sections must be an array of at most 50 sections");
  }
  if (typeof content.theme !== "object" || content.theme === null) {
    throw new BadRequestException("content.theme is required");
  }
}

function assertValidFields(fields: unknown[]): RsvpField[] {
  if (fields.length > 30) throw new BadRequestException("At most 30 RSVP fields are allowed");
  const seen = new Set<string>();
  return fields.map((raw) => {
    const f = raw as Partial<RsvpField>;
    if (
      !f ||
      typeof f.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,40}$/.test(f.id) ||
      typeof f.label !== "string" ||
      f.label.length === 0 ||
      f.label.length > 120 ||
      typeof f.type !== "string" ||
      !FIELD_TYPES.includes(f.type)
    ) {
      throw new BadRequestException("Invalid RSVP field definition");
    }
    if (seen.has(f.id)) throw new BadRequestException(`Duplicate RSVP field id: ${f.id}`);
    seen.add(f.id);
    return {
      id: f.id,
      label: f.label,
      type: f.type,
      required: Boolean(f.required),
      options: Array.isArray(f.options) ? f.options.slice(0, 30).map((o) => String(o).slice(0, 100)) : undefined,
    } as RsvpField;
  });
}

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    for (let i = 0; i < 5; i++) {
      const slug = `${base}-${randomBytes(3).toString("hex")}`;
      const taken = await this.prisma.invitation.findUnique({ where: { slug } });
      if (!taken) return slug;
    }
    throw new ConflictException("Could not generate a unique link, please try again");
  }

  private async ownedOrThrow(id: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invitation) throw new NotFoundException("Invitation not found");
    if (invitation.ownerId !== userId) throw new ForbiddenException();
    return invitation;
  }

  async create(userId: string, dto: CreateInvitationDto) {
    const content = createEmptyInvitation(dto.templateId ?? "classic");
    if (dto.title) content.title = dto.title;
    const slug = await this.uniqueSlug(dto.title ?? dto.eventType);
    return this.prisma.invitation.create({
      data: {
        slug,
        ownerId: userId,
        eventType: dto.eventType,
        content: content as unknown as Prisma.InputJsonValue,
        rsvpFields: DEFAULT_RSVP_FIELDS as unknown as Prisma.InputJsonValue,
      },
    });
  }

  list(userId: string) {
    return this.prisma.invitation.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { responses: true } } },
    });
  }

  get(id: string, userId: string) {
    return this.ownedOrThrow(id, userId);
  }

  async update(id: string, userId: string, dto: UpdateInvitationDto) {
    await this.ownedOrThrow(id, userId);
    if (dto.content) assertValidContent(dto.content);
    const rsvpFields = dto.rsvpFields ? assertValidFields(dto.rsvpFields) : undefined;

    if (dto.slug) {
      const taken = await this.prisma.invitation.findUnique({ where: { slug: dto.slug } });
      if (taken && taken.id !== id) throw new ConflictException("That link is already taken");
    }

    return this.prisma.invitation.update({
      where: { id },
      data: {
        eventType: dto.eventType,
        content: dto.content as Prisma.InputJsonValue | undefined,
        rsvpFields: rsvpFields as unknown as Prisma.InputJsonValue | undefined,
        published: dto.published,
        slug: dto.slug,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.ownedOrThrow(id, userId);
    await this.prisma.invitation.delete({ where: { id } });
    return { deleted: true };
  }

  async listResponses(id: string, userId: string) {
    await this.ownedOrThrow(id, userId);
    return this.prisma.rsvpResponse.findMany({
      where: { invitationId: id },
      orderBy: { createdAt: "desc" },
    });
  }

  async getPublic(slug: string): Promise<PublicInvitation> {
    const invitation = await this.prisma.invitation.findUnique({ where: { slug } });
    if (!invitation || !invitation.published) throw new NotFoundException("Invitation not found");
    return {
      slug: invitation.slug,
      eventType: invitation.eventType as EventType,
      content: invitation.content as unknown as PublicInvitation["content"],
      rsvpFields: invitation.rsvpFields as unknown as RsvpField[],
    };
  }

  async submitRsvp(slug: string, dto: SubmitRsvpDto) {
    const invitation = await this.prisma.invitation.findUnique({ where: { slug } });
    if (!invitation || !invitation.published) throw new NotFoundException("Invitation not found");

    const fields = invitation.rsvpFields as unknown as RsvpField[];
    const incoming = dto.answers ?? {};
    const answers: Record<string, string> = {};

    for (const field of fields) {
      const value = incoming[field.id];
      const text = value === undefined || value === null ? "" : String(value).trim().slice(0, 2000);
      if (!text && field.required && dto.status === "ATTENDING") {
        throw new BadRequestException(`"${field.label}" is required`);
      }
      if (text) answers[field.id] = text;
    }

    const response = await this.prisma.rsvpResponse.create({
      data: {
        invitationId: invitation.id,
        status: dto.status,
        guestName: dto.guestName.trim(),
        answers,
      },
    });
    return { id: response.id, received: true };
  }
}
