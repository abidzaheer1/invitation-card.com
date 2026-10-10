"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_RSVP_FIELDS, createInvitationFromTemplate, type EventType, type PublicInvitation } from "@invitation/shared";
import InvitationView from "./InvitationView";
import PhoneFrame from "./PhoneFrame";
import { cx } from "./ui";

const CHOICES: { templateId: string; eventType: EventType; label: string }[] = [
  { templateId: "golden-classic", eventType: "WEDDING", label: "Wedding" },
  { templateId: "party-pop", eventType: "BIRTHDAY", label: "Birthday" },
  { templateId: "little-star", eventType: "BABY_SHOWER", label: "Baby shower" },
  { templateId: "honor-roll", eventType: "GRADUATION", label: "Graduation" },
];

/** The landing page's live demo: a real invitation, with its 3D object, inside a phone. */
export default function HeroPhone() {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(0);
  useEffect(() => setMounted(true), []);

  const invitations = useMemo<PublicInvitation[]>(() => {
    if (!mounted) return [];
    return CHOICES.map((c) => ({
      slug: `preview-${c.templateId}`,
      eventType: c.eventType,
      content: createInvitationFromTemplate(c.templateId, c.eventType).content,
      rsvpFields: DEFAULT_RSVP_FIELDS,
    }));
  }, [mounted]);

  return (
    <div>
      <PhoneFrame height={600} label="Live example of an invitation. Scroll inside to see more.">
        {mounted ? (
          <InvitationView key={selected} invitation={invitations[selected]} demo compact />
        ) : (
          <div className="h-full w-full bg-sage-deep" aria-hidden />
        )}
      </PhoneFrame>
      <div role="group" aria-label="Choose an example" className="mt-5 flex flex-wrap justify-center gap-2">
        {CHOICES.map((c, i) => (
          <button
            key={c.templateId}
            type="button"
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
            className={cx(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              selected === i
                ? "border-marigold bg-marigold text-forest-deep"
                : "border-white/30 text-white hover:border-white/70",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
