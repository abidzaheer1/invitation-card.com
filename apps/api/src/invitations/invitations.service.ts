import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Invitation, Prisma } from "@prisma/client";
import { MailService } from "../mail/mail.service";
import {
  DEFAULT_RSVP_FIELDS,
  createInvitationFromTemplate,
  defaultTemplateFor,
  getTemplate,
  sanitizeInvitationContent,
  sanitizeRsvpFields,
  slugify,
  validateSlug,
  type EventType,
  type InvitationContent,
  type InvitationRecord,
  type InvitationSummary,
  type PublicInvitation,
  type ResponsesPayload,
  type RsvpField,
  type RsvpResponseRecord,
} from "@invitation/shared";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInvitationDto, SubmitRsvpDto, UpdateInvitationDto } from "./invitations.dto";

const MAX_INVITATIONS_GUEST = 5;
const MAX_INVITATIONS_ACCOUNT = 50;
const MAX_RESPONSES_PER_INVITATION = 2000;

function toRecord(i: Invitation): InvitationRecord {
  return {
    id: i.id,
    slug: i.slug,
    eventType: i.eventType as EventType,
    published: i.published,
    content: i.content as unknown as InvitationContent,
    rsvpFields: i.rsvpFields as unknown as RsvpField[],
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

function validateAnswer(field: RsvpField, text: string): string | null {
  switch (field.type) {
    case "number": {
      const n = Number(text);
      if (!Number.isFinite(n) || n < 0 || n > 1000) return `"${field.label}" must be a number`;
      return null;
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? null : `"${field.label}" must be a valid email`;
    case "select":
      return field.options?.includes(text) ? null : `Pick one of the choices for "${field.label}"`;
    default:
      return null;
  }
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    for (let i = 0; i < 5; i++) {
      const slug = `${base}-${randomBytes(3).toString("hex")}`;
      const taken = await this.prisma.invitation.findUnique({ where: { slug } });
      if (!taken) return slug;
    }
    throw new ConflictException("Could not generate a unique link, please try again");
  }

  private async ownedOrThrow(id: string, userId: string): Promise<Invitation> {
    const invitation = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invitation) throw new NotFoundException("Invitation not found");
    if (invitation.ownerId !== userId) throw new ForbiddenException("This invitation belongs to another account");
    return invitation;
  }

  async create(userId: string, dto: CreateInvitationDto): Promise<InvitationRecord> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException();
    const count = await this.prisma.invitation.count({ where: { ownerId: userId } });
    const max = user.isGuest ? MAX_INVITATIONS_GUEST : MAX_INVITATIONS_ACCOUNT;
    if (count >= max) {
      throw new ForbiddenException(
        user.isGuest
          ? `Guests can keep ${MAX_INVITATIONS_GUEST} invitations. Sign in to create more.`
          : `You have reached the limit of ${MAX_INVITATIONS_ACCOUNT} invitations.`,
      );
    }

    if (dto.templateId && !getTemplate(dto.templateId)) throw new BadRequestException("Unknown template");
    const templateId = dto.templateId ?? (dto.eventType ? defaultTemplateFor(dto.eventType).id : undefined);
    const { eventType, content } = createInvitationFromTemplate(templateId, dto.eventType);

    const created = await this.prisma.invitation.create({
      data: {
        slug: await this.uniqueSlug(content.title),
        ownerId: userId,
        eventType,
        content: content as unknown as Prisma.InputJsonValue,
        rsvpFields: DEFAULT_RSVP_FIELDS as unknown as Prisma.InputJsonValue,
      },
    });
    return toRecord(created);
  }

  async list(userId: string): Promise<InvitationSummary[]> {
    const rows = await this.prisma.invitation.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { responses: true } } },
    });
    return rows.map((r) => {
      const content = r.content as unknown as InvitationContent;
      return {
        id: r.id,
        slug: r.slug,
        eventType: r.eventType as EventType,
        published: r.published,
        title: content.title,
        hosts: content.hosts,
        eventDate: content.eventDate,
        coverImageUrl: content.coverImageUrl,
        theme: content.theme,
        responseCount: r._count.responses,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  }

  async get(id: string, userId: string): Promise<InvitationRecord> {
    return toRecord(await this.ownedOrThrow(id, userId));
  }

  async slugAvailable(slug: string, userId: string, id?: string) {
    const problem = validateSlug(slug);
    if (problem) return { available: false, reason: problem };
    const taken = await this.prisma.invitation.findUnique({ where: { slug } });
    if (taken && taken.id !== id) return { available: false, reason: "That address is already taken." };
    return { available: true };
  }

  async update(id: string, userId: string, dto: UpdateInvitationDto): Promise<InvitationRecord> {
    const existing = await this.ownedOrThrow(id, userId);
    const data: Prisma.InvitationUpdateInput = {};

    if (dto.content !== undefined) {
      const result = sanitizeInvitationContent(dto.content);
      if (!result.ok) throw new BadRequestException(result.error);
      data.content = result.value as unknown as Prisma.InputJsonValue;
    }
    if (dto.rsvpFields !== undefined) {
      const result = sanitizeRsvpFields(dto.rsvpFields);
      if (!result.ok) throw new BadRequestException(result.error);
      data.rsvpFields = result.value as unknown as Prisma.InputJsonValue;
    }
    if (dto.eventType !== undefined) data.eventType = dto.eventType;

    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      const check = await this.slugAvailable(dto.slug, userId, id);
      if (!check.available) throw new ConflictException(check.reason);
      data.slug = dto.slug;
    }

    if (dto.published !== undefined) {
      if (dto.published) {
        const owner = await this.prisma.user.findUnique({ where: { id: userId } });
        if (owner?.isGuest) {
          throw new ForbiddenException({
            code: "ACCOUNT_REQUIRED",
            message: "Sign in to publish your invitation.",
          });
        }
        if (owner && this.mail.requireVerifiedEmail && !owner.emailVerified) {
          throw new ForbiddenException({
            code: "EMAIL_NOT_VERIFIED",
            message: "Confirm your email address to publish. We sent you a link.",
          });
        }
      }
      data.published = dto.published;
    }

    const updated = await this.prisma.invitation.update({ where: { id }, data });
    return toRecord(updated);
  }

  async remove(id: string, userId: string) {
    await this.ownedOrThrow(id, userId);
    await this.prisma.invitation.delete({ where: { id } });
    return { deleted: true };
  }

  async listResponses(id: string, userId: string): Promise<ResponsesPayload> {
    const invitation = await this.ownedOrThrow(id, userId);
    const rows = await this.prisma.rsvpResponse.findMany({
      where: { invitationId: id },
      orderBy: { createdAt: "desc" },
    });
    const responses: RsvpResponseRecord[] = rows.map((r) => ({
      id: r.id,
      status: r.status,
      guestName: r.guestName,
      answers: r.answers as unknown as Record<string, string>,
      createdAt: r.createdAt.toISOString(),
    }));

    let guestsAttending = 0;
    for (const r of responses) {
      if (r.status !== "ATTENDING") continue;
      const n = parseInt(r.answers.guests ?? "", 10);
      guestsAttending += Number.isFinite(n) && n > 0 ? n : 1;
    }
    const count = (s: string) => responses.filter((r) => r.status === s).length;
    const content = invitation.content as unknown as InvitationContent;

    return {
      invitation: {
        id: invitation.id,
        slug: invitation.slug,
        title: content.title,
        published: invitation.published,
        rsvpFields: invitation.rsvpFields as unknown as RsvpField[],
      },
      summary: {
        attending: count("ATTENDING"),
        declined: count("DECLINED"),
        maybe: count("MAYBE"),
        total: responses.length,
        guestsAttending,
      },
      responses,
    };
  }

  async getPublic(slug: string): Promise<PublicInvitation> {
    const invitation = await this.prisma.invitation.findUnique({ where: { slug } });
    if (!invitation || !invitation.published) throw new NotFoundException("Invitation not found");
    return {
      slug: invitation.slug,
      eventType: invitation.eventType as EventType,
      content: invitation.content as unknown as InvitationContent,
      rsvpFields: invitation.rsvpFields as unknown as RsvpField[],
    };
  }

  async submitRsvp(slug: string, dto: SubmitRsvpDto) {
    const invitation = await this.prisma.invitation.findUnique({ where: { slug } });
    if (!invitation || !invitation.published) throw new NotFoundException("Invitation not found");

    const total = await this.prisma.rsvpResponse.count({ where: { invitationId: invitation.id } });
    if (total >= MAX_RESPONSES_PER_INVITATION) {
      throw new ForbiddenException("This invitation is no longer accepting responses");
    }

    const fields = invitation.rsvpFields as unknown as RsvpField[];
    const incoming = dto.answers ?? {};
    const answers: Record<string, string> = {};

    for (const field of fields) {
      const value = incoming[field.id];
      const text = value === undefined || value === null ? "" : String(value).trim().slice(0, 2000);
      if (!text) {
        if (field.required && dto.status === "ATTENDING") {
          throw new BadRequestException(`"${field.label}" is required`);
        }
        continue;
      }
      const problem = validateAnswer(field, text);
      if (problem) throw new BadRequestException(problem);
      answers[field.id] = text;
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
