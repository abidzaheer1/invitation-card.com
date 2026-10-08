import { DEFAULT_RSVP_FIELDS, type PublicInvitation } from "@invitation/shared";

/** Demo invitation shown at /i/demo. It needs no database. */
export const sampleInvitation: PublicInvitation = {
  slug: "demo",
  eventType: "WEDDING",
  rsvpFields: DEFAULT_RSVP_FIELDS,
  content: {
    templateId: "classic",
    title: "Amira & Omar",
    hosts: "Together with their families",
    eventDate: "2027-02-12T18:00",
    locationName: "Palm Garden Hall",
    locationAddress: "Dubai, United Arab Emirates",
    theme: {
      primaryColor: "#b8860b",
      backgroundColor: "#fffaf0",
      fontHeading: "Playfair Display",
      fontBody: "Inter",
    },
    sections: [
      {
        id: "hero",
        type: "hero",
        title: "Amira & Omar",
        body: "Request the pleasure of your company at their wedding celebration",
        model: { kind: "rings", autoRotate: true, color: "#d4a017" },
      },
      {
        id: "story",
        type: "story",
        title: "Our story",
        body: "We met on a rainy afternoon and have been inseparable ever since. We would be honoured to celebrate this next chapter with the people we love most.",
      },
      {
        id: "schedule",
        type: "schedule",
        title: "The evening",
        body: "6:00 PM Welcome and photos\n7:00 PM Ceremony\n8:00 PM Dinner\n10:00 PM Celebration",
      },
      {
        id: "venue",
        type: "venue",
        title: "Where",
      },
      { id: "rsvp", type: "rsvp", title: "Will you join us?" },
    ],
  },
};
