import {
  EventType,
  InvitationContent,
  InvitationSection,
  InvitationTheme,
  Model3DConfig,
} from "./types";

interface EventCopy {
  title: string;
  hosts: string;
  heroBody: string;
  storyTitle: string;
  storyBody: string;
  scheduleTitle: string;
  scheduleBody: string;
  locationName: string;
  locationAddress: string;
  rsvpTitle: string;
}

/** Starting text for each kind of event. Hosts replace all of it in the editor. */
const COPY: Record<EventType, EventCopy> = {
  WEDDING: {
    title: "Sara & Omar",
    hosts: "Together with their families",
    heroBody: "invite you to celebrate their wedding",
    storyTitle: "Our story",
    storyBody:
      "Tell your guests how you met and what this day means to you. A few warm sentences are all it takes.",
    scheduleTitle: "The day",
    scheduleBody: "5:00 PM Guests arrive\n6:00 PM Ceremony\n7:30 PM Dinner\n9:30 PM Dancing",
    locationName: "Your venue name",
    locationAddress: "City, Country",
    rsvpTitle: "Will you join us?",
  },
  ENGAGEMENT: {
    title: "Layla & Hassan",
    hosts: "Join us as we say yes",
    heroBody: "are getting engaged and would love to celebrate with you",
    storyTitle: "The proposal",
    storyBody: "Share the moment it happened, or keep it a surprise for the evening.",
    scheduleTitle: "The evening",
    scheduleBody: "6:00 PM Welcome drinks\n7:00 PM Toast\n8:00 PM Dinner",
    locationName: "Your venue name",
    locationAddress: "City, Country",
    rsvpTitle: "Will you be there?",
  },
  BIRTHDAY: {
    title: "Noor turns 30",
    hosts: "You're invited to a birthday party",
    heroBody: "Come for the cake and stay for the music.",
    storyTitle: "About the party",
    storyBody: "Tell guests what to expect: food, games, a dress code, or a surprise.",
    scheduleTitle: "Plan for the day",
    scheduleBody: "4:00 PM Doors open\n5:00 PM Games\n6:00 PM Cake\n7:00 PM Dinner",
    locationName: "Your venue name",
    locationAddress: "City, Country",
    rsvpTitle: "Are you coming?",
  },
  BABY_SHOWER: {
    title: "A little one is on the way",
    hosts: "A baby shower for Maryam",
    heroBody: "Join us for games, treats and good wishes.",
    storyTitle: "A note from us",
    storyBody: "Let guests know about gift ideas, a theme, or anything they should bring.",
    scheduleTitle: "Plan for the day",
    scheduleBody: "2:00 PM Welcome\n2:30 PM Games\n3:30 PM Tea and cake\n4:30 PM Gifts",
    locationName: "Your venue name",
    locationAddress: "City, Country",
    rsvpTitle: "Can you make it?",
  },
  ANNIVERSARY: {
    title: "25 years together",
    hosts: "Celebrating Fatima & Ali",
    heroBody: "Share an evening with us as we celebrate a quarter century of love.",
    storyTitle: "Our years",
    storyBody: "A short look back at the milestones, the laughs and the people who were there.",
    scheduleTitle: "The evening",
    scheduleBody: "6:30 PM Welcome\n7:30 PM Dinner\n8:30 PM Speeches\n9:30 PM Dessert",
    locationName: "Your venue name",
    locationAddress: "City, Country",
    rsvpTitle: "Will you celebrate with us?",
  },
  GRADUATION: {
    title: "Class of 2027",
    hosts: "Celebrating Zaid's graduation",
    heroBody: "Join us to celebrate years of hard work.",
    storyTitle: "The journey",
    storyBody: "Say a few words about the degree, the late nights, and who helped along the way.",
    scheduleTitle: "Plan for the day",
    scheduleBody: "3:00 PM Ceremony\n5:00 PM Photos\n6:00 PM Dinner",
    locationName: "Your venue name",
    locationAddress: "City, Country",
    rsvpTitle: "Will you join us?",
  },
  CORPORATE: {
    title: "Annual Partner Summit",
    hosts: "You are invited",
    heroBody: "An evening of talks, networking and dinner.",
    storyTitle: "About the event",
    storyBody: "Describe the agenda, the speakers and what attendees will take away.",
    scheduleTitle: "Agenda",
    scheduleBody: "5:00 PM Registration\n5:30 PM Keynote\n6:30 PM Panel\n7:30 PM Dinner and networking",
    locationName: "Your venue name",
    locationAddress: "City, Country",
    rsvpTitle: "Register your attendance",
  },
  OTHER: {
    title: "Come celebrate with us",
    hosts: "You're invited",
    heroBody: "We would love to have you there.",
    storyTitle: "About the day",
    storyBody: "Tell guests what the occasion is and what to expect.",
    scheduleTitle: "Plan for the day",
    scheduleBody: "4:00 PM Arrival\n5:00 PM Main event\n7:00 PM Food",
    locationName: "Your venue name",
    locationAddress: "City, Country",
    rsvpTitle: "Will you be there?",
  },
};

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  /** The first entry is the event type used when none is chosen. */
  eventTypes: EventType[];
  theme: InvitationTheme;
  model: Model3DConfig;
  /** Overrides for the starting text, on top of the event's defaults. */
  copy?: Partial<EventCopy>;
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "golden-classic",
    name: "Golden Classic",
    description: "Warm gold on ivory with a slowly turning pair of rings.",
    eventTypes: ["WEDDING", "ENGAGEMENT", "ANNIVERSARY"],
    theme: {
      primaryColor: "#9a6f0a",
      backgroundColor: "#fffaf0",
      textColor: "#2a2118",
      fontHeading: "Playfair Display",
      fontBody: "Inter",
    },
    model: { kind: "rings", color: "#d4a017", autoRotate: true },
  },
  {
    id: "blush-garden",
    name: "Blush Garden",
    description: "Soft pink with flowing script and a floating heart.",
    eventTypes: ["WEDDING", "ENGAGEMENT"],
    theme: {
      primaryColor: "#b23a62",
      backgroundColor: "#fff1f3",
      textColor: "#4a2a33",
      fontHeading: "Great Vibes",
      fontBody: "Lora",
    },
    model: { kind: "heart", color: "#e0617f", autoRotate: true },
  },
  {
    id: "midnight-luxe",
    name: "Midnight Luxe",
    description: "Deep navy and gold for a formal evening.",
    eventTypes: ["WEDDING", "ANNIVERSARY", "CORPORATE"],
    theme: {
      primaryColor: "#e0b872",
      backgroundColor: "#0f1b2d",
      textColor: "#f1ead9",
      fontHeading: "Cinzel",
      fontBody: "Montserrat",
    },
    model: { kind: "rings", color: "#e0b872", autoRotate: true },
  },
  {
    id: "emerald-nikah",
    name: "Emerald Nikah",
    description: "Emerald and gold with stars, made for nikah and valima.",
    eventTypes: ["WEDDING"],
    theme: {
      primaryColor: "#e2b24d",
      backgroundColor: "#0d3b32",
      textColor: "#f6efdc",
      fontHeading: "Cormorant Garamond",
      fontBody: "Lora",
    },
    model: { kind: "stars", color: "#e2b24d", autoRotate: true },
    copy: {
      title: "Aisha & Yusuf",
      hosts: "With the blessings of their families",
      heroBody: "invite you to their Nikah and Valima",
      scheduleTitle: "The celebrations",
      scheduleBody: "Nikah\n4:00 PM Nikah ceremony\n5:00 PM Refreshments\nValima\n7:30 PM Guests arrive\n8:30 PM Dinner",
    },
  },
  {
    id: "rose-promise",
    name: "Rose Promise",
    description: "Rose gold and quiet serif type for an engagement.",
    eventTypes: ["ENGAGEMENT", "WEDDING"],
    theme: {
      primaryColor: "#a3535f",
      backgroundColor: "#fdf4f2",
      textColor: "#3d2a2d",
      fontHeading: "Cormorant Garamond",
      fontBody: "Inter",
    },
    model: { kind: "rings", color: "#d79a8f", autoRotate: true },
  },
  {
    id: "party-pop",
    name: "Party Pop",
    description: "Bright and playful with a bunch of balloons.",
    eventTypes: ["BIRTHDAY"],
    theme: {
      primaryColor: "#d6336c",
      backgroundColor: "#fff7e6",
      textColor: "#2b2140",
      fontHeading: "Poppins",
      fontBody: "Poppins",
    },
    model: { kind: "balloons", color: "#f5b82e", autoRotate: true },
  },
  {
    id: "golden-milestone",
    name: "Golden Milestone",
    description: "Dark and glossy with a candlelit cake.",
    eventTypes: ["BIRTHDAY", "ANNIVERSARY"],
    theme: {
      primaryColor: "#f2c14e",
      backgroundColor: "#1a1625",
      textColor: "#f5f0e6",
      fontHeading: "Montserrat",
      fontBody: "Inter",
    },
    model: { kind: "cake", color: "#c0457a", autoRotate: true },
  },
  {
    id: "little-star",
    name: "Little Star",
    description: "Gentle blue with handwritten type and twinkling stars.",
    eventTypes: ["BABY_SHOWER", "BIRTHDAY"],
    theme: {
      primaryColor: "#3b6fc4",
      backgroundColor: "#f2f7ff",
      textColor: "#243449",
      fontHeading: "Dancing Script",
      fontBody: "Poppins",
    },
    model: { kind: "stars", color: "#f2b632", autoRotate: true },
  },
  {
    id: "soft-clouds",
    name: "Soft Clouds",
    description: "Fresh mint with balloons, for a calm baby shower.",
    eventTypes: ["BABY_SHOWER"],
    theme: {
      primaryColor: "#2f8573",
      backgroundColor: "#f1faf7",
      textColor: "#23413a",
      fontHeading: "Dancing Script",
      fontBody: "Lora",
    },
    model: { kind: "balloons", color: "#58b9a4", autoRotate: true },
  },
  {
    id: "timeless-hearts",
    name: "Timeless Hearts",
    description: "Deep red and cream for years of love.",
    eventTypes: ["ANNIVERSARY", "WEDDING"],
    theme: {
      primaryColor: "#9d2f35",
      backgroundColor: "#fbf3ee",
      textColor: "#3a1f20",
      fontHeading: "Playfair Display",
      fontBody: "Lora",
    },
    model: { kind: "heart", color: "#b83b42", autoRotate: true },
  },
  {
    id: "honor-roll",
    name: "Honor Roll",
    description: "Navy and gold with a shower of stars.",
    eventTypes: ["GRADUATION"],
    theme: {
      primaryColor: "#f0b429",
      backgroundColor: "#12263f",
      textColor: "#eef2f7",
      fontHeading: "Montserrat",
      fontBody: "Inter",
    },
    model: { kind: "stars", color: "#f0b429", autoRotate: true },
  },
  {
    id: "clean-summit",
    name: "Clean Summit",
    description: "Crisp and professional, with one quiet 3D accent.",
    eventTypes: ["CORPORATE"],
    theme: {
      primaryColor: "#1d4ed8",
      backgroundColor: "#f8fafc",
      textColor: "#0f172a",
      fontHeading: "Poppins",
      fontBody: "Inter",
    },
    model: { kind: "stars", color: "#3b82f6", autoRotate: true },
  },
  {
    id: "garden-party",
    name: "Garden Party",
    description: "Leafy green and relaxed script for any get-together.",
    eventTypes: ["OTHER", "BIRTHDAY", "ENGAGEMENT"],
    theme: {
      primaryColor: "#2f7a49",
      backgroundColor: "#f4fbef",
      textColor: "#1f3326",
      fontHeading: "Dancing Script",
      fontBody: "Lora",
    },
    model: { kind: "gift", color: "#c9553d", autoRotate: true },
  },
  {
    id: "celebration-box",
    name: "Celebration Box",
    description: "Violet and playful with a wrapped gift.",
    eventTypes: ["OTHER", "BIRTHDAY", "GRADUATION"],
    theme: {
      primaryColor: "#6d3fd1",
      backgroundColor: "#f7f3ff",
      textColor: "#2a1f45",
      fontHeading: "Poppins",
      fontBody: "Poppins",
    },
    model: { kind: "gift", color: "#8b5cf6", autoRotate: true },
  },
];

export function getTemplate(id: string | undefined): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function templatesForEvent(type: EventType): TemplateDef[] {
  return TEMPLATES.filter((t) => t.eventTypes.includes(type));
}

export function defaultTemplateFor(type: EventType): TemplateDef {
  return templatesForEvent(type)[0] ?? TEMPLATES[0];
}

function defaultEventDate(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 60));
  return `${d.toISOString().slice(0, 10)}T18:00`;
}

let counter = 0;
function sid(name: string): string {
  counter += 1;
  return `${name}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export interface NewInvitation {
  eventType: EventType;
  content: InvitationContent;
}

/**
 * Builds the starting content for a new invitation from a template.
 * `eventType` defaults to the template's first event type.
 */
export function createInvitationFromTemplate(
  templateId: string | undefined,
  eventType?: EventType,
  now: Date = new Date(),
): NewInvitation {
  const template = getTemplate(templateId) ?? TEMPLATES[0];
  const type = eventType ?? template.eventTypes[0];
  const copy: EventCopy = { ...COPY[type], ...template.copy };

  const sections: InvitationSection[] = [
    {
      id: sid("hero"),
      type: "hero",
      title: copy.title,
      body: copy.heroBody,
      model: { ...template.model },
    },
    { id: sid("count"), type: "countdown", title: "Counting down" },
    { id: sid("story"), type: "story", title: copy.storyTitle, body: copy.storyBody },
    { id: sid("sched"), type: "schedule", title: copy.scheduleTitle, body: copy.scheduleBody },
    { id: sid("venue"), type: "venue", title: "Where" },
    { id: sid("rsvp"), type: "rsvp", title: copy.rsvpTitle },
  ];

  return {
    eventType: type,
    content: {
      templateId: template.id,
      title: copy.title,
      hosts: copy.hosts,
      eventDate: defaultEventDate(now),
      locationName: copy.locationName,
      locationAddress: copy.locationAddress,
      theme: { ...template.theme },
      sections,
    },
  };
}
