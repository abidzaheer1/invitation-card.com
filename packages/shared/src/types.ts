/**
 * Types and helpers shared by the web app and the API.
 * An invitation is stored as JSON (`InvitationContent`) so the exact same data
 * renders the editor preview and the published site.
 */


export const EVENT_TYPES = [
  "WEDDING",
  "ENGAGEMENT",
  "BIRTHDAY",
  "BABY_SHOWER",
  "ANNIVERSARY",
  "GRADUATION",
  "CORPORATE",
  "OTHER",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_LABELS: Record<EventType, string> = {
  WEDDING: "Wedding",
  ENGAGEMENT: "Engagement",
  BIRTHDAY: "Birthday",
  BABY_SHOWER: "Baby shower",
  ANNIVERSARY: "Anniversary",
  GRADUATION: "Graduation",
  CORPORATE: "Corporate",
  OTHER: "Other gathering",
};

export const SECTION_TYPES = [
  "hero",
  "story",
  "schedule",
  "venue",
  "gallery",
  "countdown",
  "rsvp",
  "custom",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Cover",
  story: "Story",
  schedule: "Schedule",
  venue: "Venue",
  gallery: "Photos",
  countdown: "Countdown",
  rsvp: "RSVP form",
  custom: "Free text",
};

export const MODEL_KINDS = ["none", "rings", "heart", "balloons", "cake", "gift", "stars", "custom"] as const;
export type Model3DKind = (typeof MODEL_KINDS)[number];

export const MODEL_LABELS: Record<Model3DKind, string> = {
  none: "None",
  rings: "Rings",
  heart: "Heart",
  balloons: "Balloons",
  cake: "Cake",
  gift: "Gift",
  stars: "Stars",
  custom: "Your own model",
};

export interface Model3DConfig {
  kind: Model3DKind;
  /** URL of an uploaded .glb file when kind === "custom" */
  url?: string;
  color?: string;
  autoRotate?: boolean;
}

export interface InvitationTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
}

export interface InvitationSection {
  id: string;
  type: SectionType;
  title?: string;
  body?: string;
  imageUrls?: string[];
  model?: Model3DConfig;
}

export interface InvitationContent {
  templateId: string;
  title: string;
  hosts: string;
  /** Wall-clock date and time at the venue, "YYYY-MM-DDTHH:mm" */
  eventDate?: string;
  locationName?: string;
  locationAddress?: string;
  coverImageUrl?: string;
  theme: InvitationTheme;
  sections: InvitationSection[];
}

export type RsvpFieldType = "text" | "email" | "phone" | "number" | "select" | "textarea";
export const RSVP_FIELD_TYPES: RsvpFieldType[] = ["text", "email", "phone", "number", "select", "textarea"];

export interface RsvpField {
  id: string;
  label: string;
  type: RsvpFieldType;
  required: boolean;
  options?: string[];
}

export type RsvpStatus = "ATTENDING" | "DECLINED" | "MAYBE";

export const DEFAULT_RSVP_FIELDS: RsvpField[] = [
  { id: "name", label: "Your name", type: "text", required: true },
  { id: "guests", label: "Number of guests", type: "number", required: true },
  { id: "message", label: "Message for the hosts", type: "textarea", required: false },
];

export const DEFAULT_THEME: InvitationTheme = {
  primaryColor: "#b8860b",
  backgroundColor: "#fffaf0",
  textColor: "#2a2118",
  fontHeading: "Playfair Display",
  fontBody: "Inter",
};

/** What the API returns for the signed-in user's invitation. */
export interface InvitationRecord {
  id: string;
  slug: string;
  eventType: EventType;
  published: boolean;
  content: InvitationContent;
  rsvpFields: RsvpField[];
  createdAt: string;
  updatedAt: string;
}

/** One row of the dashboard list. */
export interface InvitationSummary {
  id: string;
  slug: string;
  eventType: EventType;
  published: boolean;
  title: string;
  hosts: string;
  eventDate?: string;
  coverImageUrl?: string;
  theme: InvitationTheme;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicInvitation {
  slug: string;
  eventType: EventType;
  content: InvitationContent;
  rsvpFields: RsvpField[];
}

export interface RsvpResponseRecord {
  id: string;
  status: RsvpStatus;
  guestName: string;
  answers: Record<string, string>;
  createdAt: string;
}

export interface ResponsesPayload {
  invitation: { id: string; slug: string; title: string; published: boolean; rsvpFields: RsvpField[] };
  summary: { attending: number; declined: number; maybe: number; total: number; guestsAttending: number };
  responses: RsvpResponseRecord[];
}

export interface AuthUser {
  id: string;
  email: string | null;
  isGuest: boolean;
  name: string | null;
  /** The address has been confirmed, by Google or by clicking the emailed link. */
  emailVerified: boolean;
  /** The account can sign in with a password. */
  hasPassword: boolean;
  /** A Google account is linked. */
  hasGoogle: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AuthConfig {
  /** Google OAuth client id, or null when Google sign-in is not configured. */
  googleClientId: string | null;
  /** True when the server can send email, so password reset and verification are available. */
  emailEnabled: boolean;
}

export interface UploadResult {
  url: string;
  bytes: number;
  kind: "image" | "model";
}

/** Slugs that cannot be chosen for a published invitation. */
export const RESERVED_SLUGS = [
  "demo",
  "api",
  "admin",
  "create",
  "dashboard",
  "editor",
  "signin",
  "sign-in",
  "login",
  "logout",
  "register",
  "new",
  "i",
  "static",
  "uploads",
  "www",
  "app",
  "mail",
  "ftp",
  "cdn",
  "assets",
  "files",
  "images",
  "fonts",
  "help",
  "support",
  "billing",
  "account",
  "auth",
  "staging",
  "preview",
  "dev",
  "docs",
  "blog",
  "status",
  "smtp",
  "webmail",
];

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(slug: string): string | null {
  if (slug.length < 3 || slug.length > 60) return "Use between 3 and 60 characters.";
  if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters, numbers and single hyphens.";
  if (RESERVED_SLUGS.includes(slug)) return "That address is reserved. Try another.";
  return null;
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return base || "invitation";
}

export function newSectionId(): string {
  return `s${Math.random().toString(36).slice(2, 10)}`;
}
