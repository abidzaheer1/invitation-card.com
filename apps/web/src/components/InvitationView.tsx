import type { CSSProperties, ReactNode } from "react";
import { fontStack, isUploadUrl, readableTextOn, type InvitationSection, type PublicInvitation } from "@invitation/shared";
import { formatEventDate, safeColor } from "@/lib/format";
import AddToCalendar from "./AddToCalendar";
import Countdown from "./Countdown";
import ModelViewer from "./ModelViewer";
import RsvpForm from "./RsvpForm";

const HEADING_STYLE: CSSProperties = {
  fontFamily: "var(--inv-font-heading)",
  fontWeight: "var(--inv-heading-weight)" as unknown as number,
  color: "var(--inv-primary)",
};

// Scripts and serifs read best at regular weight; plain sans-serifs need some weight to hold up.
const BOLD_HEADINGS = ["Montserrat", "Poppins", "Inter"];

function SectionTitle({ children, compact }: { children: ReactNode; compact: boolean }) {
  return (
    <h2 className={compact ? "text-3xl leading-tight" : "text-4xl leading-tight sm:text-5xl"} style={HEADING_STYLE}>
      {children}
    </h2>
  );
}

function ModelBlock({ section, compact }: { section: InvitationSection; compact: boolean }) {
  if (!section.model || section.model.kind === "none") return null;
  return (
    <div className={compact ? "mx-auto h-52 w-full max-w-xs" : "mx-auto h-64 w-full max-w-md sm:h-80"} aria-hidden>
      <ModelViewer model={section.model} />
    </div>
  );
}

function Section({
  section,
  invitation,
  demo,
  compact,
}: {
  section: InvitationSection;
  invitation: PublicInvitation;
  demo: boolean;
  compact: boolean;
}) {
  const { content } = invitation;
  const date = formatEventDate(content.eventDate);
  const hasRsvp = content.sections.some((s) => s.type === "rsvp");
  const pad = compact ? "px-5 py-12" : "px-6 py-20";

  switch (section.type) {
    case "hero": {
      const cover = isUploadUrl(content.coverImageUrl) ? content.coverImageUrl : null;
      const Heading = compact ? "h2" : "h1";
      const venue = [content.locationName, content.locationAddress].filter(Boolean).join(", ");
      return (
        <section
          className={`relative isolate flex flex-col items-center justify-center overflow-hidden px-6 py-14 text-center ${
            compact ? "min-h-[600px]" : "min-h-[100svh]"
          }`}
        >
          {cover && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
              <div
                className="absolute inset-0 -z-10"
                style={{ background: "color-mix(in srgb, var(--inv-bg) 70%, transparent)" }}
              />
            </>
          )}
          <ModelBlock section={section} compact={compact} />
          {content.hosts && <p className="mt-4 max-w-md text-base opacity-80 sm:text-lg">{content.hosts}</p>}
          <Heading
            className={`mt-3 text-balance break-words leading-[1.05] ${compact ? "text-5xl" : "text-6xl sm:text-8xl"}`}
            style={HEADING_STYLE}
          >
            {content.title}
          </Heading>
          {section.body && <p className="mt-5 max-w-xl text-lg opacity-85">{section.body}</p>}
          {date && <p className="mt-8 text-xl font-semibold">{date}</p>}
          {venue && <p className="mt-1 max-w-md opacity-80">{venue}</p>}
          {!compact && (date || hasRsvp) && (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {hasRsvp && (
                <a
                  href="#rsvp"
                  className="rounded-lg bg-[var(--inv-primary)] px-6 py-2.5 text-base font-semibold text-[color:var(--inv-on-primary)] transition hover:opacity-90"
                >
                  Reply
                </a>
              )}
              {content.eventDate && (
                <AddToCalendar slug={invitation.slug} title={content.title} eventDate={content.eventDate} location={venue || undefined} />
              )}
            </div>
          )}
        </section>
      );
    }

    case "countdown":
      if (!content.eventDate) return null;
      return (
        <section className={`mx-auto max-w-2xl text-center ${compact ? "px-5 py-10" : "px-6 py-14"}`}>
          {section.title && <p className="mb-5 text-lg opacity-80">{section.title}</p>}
          <Countdown target={content.eventDate} />
        </section>
      );

    case "story":
    case "custom":
      return (
        <section className={`mx-auto max-w-2xl text-center ${pad}`}>
          <ModelBlock section={section} compact={compact} />
          {section.title && <SectionTitle compact={compact}>{section.title}</SectionTitle>}
          {section.body && (
            <p className={`mt-6 whitespace-pre-line leading-relaxed opacity-90 ${compact ? "text-base" : "text-lg"}`}>
              {section.body}
            </p>
          )}
        </section>
      );

    case "schedule": {
      const lines = (section.body ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
      return (
        <section className={`mx-auto max-w-xl ${pad}`}>
          <div className="text-center">
            <SectionTitle compact={compact}>{section.title ?? "Schedule"}</SectionTitle>
          </div>
          <ul className={`mt-8 ${compact ? "text-base" : "text-lg"}`}>
            {lines.map((line, i) => (
              <li key={i} className="border-b py-3 first:border-t" style={{ borderColor: "var(--inv-border)" }}>
                {line}
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case "venue": {
      const query = [content.locationName, content.locationAddress].filter(Boolean).join(", ");
      return (
        <section className={`mx-auto max-w-xl text-center ${pad}`}>
          <SectionTitle compact={compact}>{section.title ?? "Venue"}</SectionTitle>
          {content.locationName && <p className="mt-6 text-xl font-semibold">{content.locationName}</p>}
          {content.locationAddress && <p className="mt-1 opacity-80">{content.locationAddress}</p>}
          {query && (
            <a
              className="mt-6 inline-block rounded-lg border px-5 py-2.5 font-semibold transition hover:opacity-80"
              style={{ borderColor: "var(--inv-primary)", color: "var(--inv-primary)" }}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in Maps
            </a>
          )}
        </section>
      );
    }

    case "gallery": {
      const urls = (section.imageUrls ?? []).filter((u) => isUploadUrl(u));
      if (urls.length === 0) return null;
      return (
        <section className={`mx-auto max-w-4xl ${compact ? "px-4 py-10" : "px-6 py-20"}`}>
          {section.title && (
            <div className="mb-8 text-center">
              <SectionTitle compact={compact}>{section.title}</SectionTitle>
            </div>
          )}
          <div className={`grid gap-2 sm:gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
            {urls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </section>
      );
    }

    case "rsvp":
      return (
        <section id={compact ? undefined : "rsvp"} className={`mx-auto max-w-xl text-center ${compact ? "px-5 py-12" : "px-6 py-24"}`}>
          <div className="mb-8">
            <SectionTitle compact={compact}>{section.title ?? "RSVP"}</SectionTitle>
          </div>
          <RsvpForm slug={invitation.slug} fields={invitation.rsvpFields} demo={demo} />
        </section>
      );

    default:
      return null;
  }
}

export default function InvitationView({
  invitation,
  demo = false,
  compact = false,
  homeHref = "/",
}: {
  invitation: PublicInvitation;
  /** Demo and preview mode never send replies. */
  demo?: boolean;
  /** Fits inside a phone frame instead of the full window. */
  compact?: boolean;
  /** Product site. On a hosted invitation this is the main domain, not the invitation address. */
  homeHref?: string;
}) {
  const { theme } = invitation.content;
  const primary = safeColor(theme.primaryColor, "#b8860b");
  const bg = safeColor(theme.backgroundColor, "#fffaf0");
  const text = safeColor(theme.textColor, "#2a2118");
  const darkBackground = readableTextOn(bg) === "#ffffff";

  const style = {
    "--inv-primary": primary,
    "--inv-bg": bg,
    "--inv-text": text,
    "--inv-on-primary": readableTextOn(primary),
    "--inv-border": "color-mix(in srgb, var(--inv-text) 24%, transparent)",
    "--inv-field": "color-mix(in srgb, var(--inv-text) 7%, var(--inv-bg))",
    "--inv-error": darkBackground ? "#ffb4a8" : "#b3261e",
    "--inv-font-heading": fontStack(theme.fontHeading),
    "--inv-font-body": fontStack(theme.fontBody),
    "--inv-heading-weight": BOLD_HEADINGS.includes(theme.fontHeading) ? 700 : 400,
    background: "var(--inv-bg)",
    color: "var(--inv-text)",
    fontFamily: "var(--inv-font-body)",
    colorScheme: darkBackground ? "dark" : "light",
  } as CSSProperties;

  return (
    <main style={style} className={compact ? "min-h-full" : "min-h-screen"}>
      {invitation.content.sections.map((section) => (
        <Section key={section.id} section={section} invitation={invitation} demo={demo} compact={compact} />
      ))}
      <footer className="px-6 py-10 text-center text-sm opacity-70">
        Made with{" "}
        {compact ? (
          <span className="underline">Invitation-card.com</span>
        ) : (
          <a href={homeHref} className="underline">
            Invitation-card.com
          </a>
        )}
      </footer>
    </main>
  );
}
