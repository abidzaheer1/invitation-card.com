import { createInvitationFromTemplate, type PublicInvitation } from "@invitation/shared";

/** The invitation shown at /i/demo. It needs no database, and its date is always in the future. */
export function getSampleInvitation(): PublicInvitation {
  const { eventType, content } = createInvitationFromTemplate("golden-classic", "WEDDING");
  content.title = "Amira & Omar";
  content.hosts = "Together with their families";
  content.locationName = "Palm Garden Hall";
  content.locationAddress = "Dubai, United Arab Emirates";
  for (const s of content.sections) {
    if (s.type === "hero") s.body = "request the pleasure of your company at their wedding celebration";
    if (s.type === "story") {
      s.title = "Our story";
      s.body =
        "We met on a rainy afternoon and have been inseparable ever since. We would be honoured to celebrate this next chapter with the people we love most.";
    }
  }
  return {
    slug: "demo",
    eventType,
    content,
    rsvpFields: [
      { id: "name", label: "Your name", type: "text", required: true },
      { id: "guests", label: "Number of guests", type: "number", required: true },
      { id: "message", label: "Message for the hosts", type: "textarea", required: false },
    ],
  };
}
