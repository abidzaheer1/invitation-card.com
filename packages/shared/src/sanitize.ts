import { FONT_NAMES } from "./fonts";
import {
  InvitationContent,
  InvitationSection,
  MODEL_KINDS,
  Model3DConfig,
  RSVP_FIELD_TYPES,
  RsvpField,
  SECTION_TYPES,
} from "./types";

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const UPLOAD_URL = /^\/api\/uploads\/[A-Za-z0-9_-]{8,80}\.(?:webp|glb)$/;
const EVENT_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** True for files this app stored itself. Invitations may not link to outside files. */
export function isUploadUrl(value: unknown): value is string {
  return typeof value === "string" && UPLOAD_URL.test(value);
}

/** Black or white, whichever reads better on the given hex background. */
export function readableTextOn(hex: string): string {
  if (!isHexColor(hex)) return "#ffffff";
  const h = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.4 ? "#1a1612" : "#ffffff";
}

export type Sanitized<T> = { ok: true; value: T } | { ok: false; error: string };

class Fail extends Error {}
const fail = (message: string): never => {
  throw new Fail(message);
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function optText(v: unknown, label: string, max: number): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string") return fail(`${label} must be text`);
  if (v.length > max) return fail(`${label} is too long (at most ${max} characters)`);
  return v;
}

function reqText(v: unknown, label: string, max: number): string {
  const out = optText(v, label, max);
  return out ?? fail(`${label} is required`);
}

function sanitizeModel(v: unknown): Model3DConfig | undefined {
  if (v === undefined || v === null) return undefined;
  if (!isObject(v)) return fail("3D settings are invalid");
  const kind = v.kind;
  if (typeof kind !== "string" || !(MODEL_KINDS as readonly string[]).includes(kind)) {
    return fail("Unknown 3D object");
  }
  const model: Model3DConfig = { kind: kind as Model3DConfig["kind"] };
  if (v.color !== undefined && v.color !== null && v.color !== "") {
    if (!isHexColor(v.color)) return fail("3D color must be a hex color like #d4a017");
    model.color = v.color;
  }
  if (v.autoRotate !== undefined) model.autoRotate = Boolean(v.autoRotate);
  if (kind === "custom") {
    if (!isUploadUrl(v.url) || !v.url.endsWith(".glb")) {
      return fail("Upload a .glb file to use your own 3D model");
    }
    model.url = v.url;
  }
  return model;
}

function sanitizeSection(v: unknown): InvitationSection {
  if (!isObject(v)) return fail("A section is invalid");
  if (typeof v.id !== "string" || !ID.test(v.id)) return fail("A section has an invalid id");
  if (typeof v.type !== "string" || !(SECTION_TYPES as readonly string[]).includes(v.type)) {
    return fail("Unknown section type");
  }
  const section: InvitationSection = { id: v.id, type: v.type as InvitationSection["type"] };
  const title = optText(v.title, "Section title", 150);
  const body = optText(v.body, "Section text", 5000);
  if (title !== undefined) section.title = title;
  if (body !== undefined) section.body = body;
  if (v.imageUrls !== undefined && v.imageUrls !== null) {
    if (!Array.isArray(v.imageUrls)) return fail("Photos must be a list");
    if (v.imageUrls.length > 24) return fail("A gallery can have at most 24 photos");
    section.imageUrls = v.imageUrls.map((u) => (isUploadUrl(u) && !u.endsWith(".glb") ? u : fail("Photos must be uploaded to this site")));
  }
  const model = sanitizeModel(v.model);
  if (model) section.model = model;
  return section;
}

/** Validates unknown input and returns a clean, typed InvitationContent (unknown keys are dropped). */
export function sanitizeInvitationContent(raw: unknown): Sanitized<InvitationContent> {
  try {
    if (!isObject(raw)) return fail("Invitation content is missing");
    if (!isObject(raw.theme)) return fail("Theme is required");
    const t = raw.theme;
    if (!isHexColor(t.primaryColor)) return fail("Accent color must be a hex color like #b8860b");
    if (!isHexColor(t.backgroundColor)) return fail("Background color must be a hex color like #fffaf0");
    if (!isHexColor(t.textColor)) return fail("Text color must be a hex color like #2a2118");
    if (typeof t.fontHeading !== "string" || !FONT_NAMES.includes(t.fontHeading)) return fail("Unknown heading font");
    if (typeof t.fontBody !== "string" || !FONT_NAMES.includes(t.fontBody)) return fail("Unknown body font");

    const templateId = reqText(raw.templateId, "Template", 60);
    if (!/^[a-z0-9-]+$/.test(templateId)) return fail("Template id is invalid");

    const eventDate = optText(raw.eventDate, "Event date", 16);
    if (eventDate !== undefined) {
      if (!EVENT_DATE.test(eventDate) || Number.isNaN(Date.parse(`${eventDate}:00Z`))) {
        return fail("Event date must look like 2027-02-12T18:00");
      }
    }
    const cover = raw.coverImageUrl;
    if (cover !== undefined && cover !== null && cover !== "" && !(isUploadUrl(cover) && !cover.endsWith(".glb"))) {
      return fail("The cover photo must be uploaded to this site");
    }

    if (!Array.isArray(raw.sections)) return fail("Sections must be a list");
    if (raw.sections.length === 0 || raw.sections.length > 30) return fail("An invitation needs 1 to 30 sections");
    const sections = raw.sections.map(sanitizeSection);
    const ids = new Set<string>();
    for (const s of sections) {
      if (ids.has(s.id)) return fail("Two sections share the same id");
      ids.add(s.id);
    }
    if (sections.filter((s) => s.type === "hero").length !== 1) return fail("An invitation needs exactly one cover section");
    if (sections.filter((s) => s.type === "rsvp").length > 1) return fail("Only one RSVP form is allowed");
    if (sections.filter((s) => s.type === "countdown").length > 1) return fail("Only one countdown is allowed");

    const content: InvitationContent = {
      templateId,
      title: optText(raw.title, "Title", 120) ?? "",
      hosts: optText(raw.hosts, "Hosts line", 200) ?? "",
      theme: {
        primaryColor: t.primaryColor,
        backgroundColor: t.backgroundColor,
        textColor: t.textColor,
        fontHeading: t.fontHeading,
        fontBody: t.fontBody,
      },
      sections,
    };
    if (eventDate !== undefined) content.eventDate = eventDate;
    const locationName = optText(raw.locationName, "Venue name", 150);
    const locationAddress = optText(raw.locationAddress, "Venue address", 250);
    if (locationName !== undefined) content.locationName = locationName;
    if (locationAddress !== undefined) content.locationAddress = locationAddress;
    if (typeof cover === "string" && cover) content.coverImageUrl = cover;
    return { ok: true, value: content };
  } catch (e) {
    if (e instanceof Fail) return { ok: false, error: e.message };
    throw e;
  }
}

export function sanitizeRsvpFields(raw: unknown): Sanitized<RsvpField[]> {
  try {
    if (!Array.isArray(raw)) return fail("RSVP fields must be a list");
    if (raw.length > 30) return fail("At most 30 RSVP questions are allowed");
    const seen = new Set<string>();
    const fields = raw.map((f): RsvpField => {
      if (!isObject(f)) return fail("An RSVP question is invalid");
      if (typeof f.id !== "string" || !ID.test(f.id)) return fail("An RSVP question has an invalid id");
      if (seen.has(f.id)) return fail("Two RSVP questions share the same id");
      seen.add(f.id);
      const label = reqText(f.label, "Question", 120);
      if (typeof f.type !== "string" || !(RSVP_FIELD_TYPES as string[]).includes(f.type)) {
        return fail("Unknown RSVP question type");
      }
      const field: RsvpField = {
        id: f.id,
        label,
        type: f.type as RsvpField["type"],
        required: Boolean(f.required),
      };
      if (f.type === "select") {
        if (!Array.isArray(f.options) || f.options.length === 0) return fail(`"${label}" needs at least one choice`);
        if (f.options.length > 30) return fail("A question can have at most 30 choices");
        field.options = f.options.map((o) => {
          const text = typeof o === "string" ? o.trim() : "";
          if (!text || text.length > 100) return fail(`Choices for "${label}" must be 1 to 100 characters`);
          return text;
        });
      }
      return field;
    });
    return { ok: true, value: fields };
  } catch (e) {
    if (e instanceof Fail) return { ok: false, error: e.message };
    throw e;
  }
}
