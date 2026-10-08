/**
 * Types shared by the web app and the API.
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

export const SECTION_TYPES = [
  "hero",
  "story",
  "schedule",
  "venue",
  "gallery",
  "rsvp",
  "custom",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export type Model3DKind = "none" | "rings" | "balloons" | "cake" | "heart" | "custom";

export interface Model3DConfig {
  kind: Model3DKind;
  /** URL of a .glb file when kind === "custom" */
  url?: string;
  color?: string;
  autoRotate?: boolean;
}

export interface InvitationTheme {
  primaryColor: string;
  backgroundColor: string;
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
  /** ISO 8601 date-time of the event */
  eventDate?: string;
  locationName?: string;
  locationAddress?: string;
  theme: InvitationTheme;
  sections: InvitationSection[];
}

export type RsvpFieldType = "text" | "email" | "phone" | "number" | "select" | "textarea";

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
  fontHeading: "Playfair Display",
  fontBody: "Inter",
};

export function createEmptyInvitation(templateId = "classic"): InvitationContent {
  return {
    templateId,
    title: "You're invited",
    hosts: "",
    theme: { ...DEFAULT_THEME },
    sections: [
      { id: "hero", type: "hero", title: "You're invited", model: { kind: "rings", autoRotate: true } },
      { id: "rsvp", type: "rsvp", title: "Will you join us?" },
    ],
  };
}

export interface PublicInvitation {
  slug: string;
  eventType: EventType;
  content: InvitationContent;
  rsvpFields: RsvpField[];
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string | null;
    isGuest: boolean;
    name: string | null;
  };
}
