import type { CSSProperties } from "react";
import type { InvitationSection, PublicInvitation } from "@invitation/shared";
import { formatEventDate, safeColor, safeFont, safeImageUrl } from "@/lib/format";
import ModelViewer from "./ModelViewer";
import RsvpForm from "./RsvpForm";

function Section({ section, invitation, demo }: { section: InvitationSection; invitation: PublicInvitation; demo: boolean }) {
  const { content } = invitation;
  const date = formatEventDate(content.eventDate);

  switch (section.type) {
    case "hero":
      return (
        <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-16 text-center">
          {section.model && section.model.kind !== "none" && (
            <div className="h-64 w-full max-w-md sm:h-80" aria-hidden>
              <ModelViewer model={section.model} />
            </div>
          )}
          {content.hosts && <p className="mt-6 text-sm uppercase tracking-[0.25em] opacity-70">{content.hosts}</p>}
          <h1
            className="mt-4 text-5xl leading-tight sm:text-7xl"
            style={{ fontFamily: "var(--inv-font-heading)", color: "var(--inv-primary)" }}
          >
            {section.title ?? content.title}
          </h1>
          {section.body && <p className="mt-5 max-w-xl text-lg opacity-80">{section.body}</p>}
          {date && <p className="mt-8 text-xl font-medium">{date}</p>}
          {content.locationName && <p className="mt-1 opacity-80">{content.locationName}</p>}
        </section>
      );

    case "story":
    case "custom":
      return (
        <section className="mx-auto max-w-2xl px-6 py-20 text-center">
          {section.title && (
            <h2 className="text-4xl" style={{ fontFamily: "var(--inv-font-heading)", color: "var(--inv-primary)" }}>
              {section.title}
            </h2>
          )}
          {section.body && <p className="mt-6 whitespace-pre-line text-lg leading-relaxed opacity-85">{section.body}</p>}
        </section>
      );

    case "schedule": {
      const lines = (section.body ?? "").split("\n").filter(Boolean);
      return (
        <section className="mx-auto max-w-xl px-6 py-20">
          <h2 className="text-center text-4xl" style={{ fontFamily: "var(--inv-font-heading)", color: "var(--inv-primary)" }}>
            {section.title ?? "Schedule"}
          </h2>
          <ul className="mt-8 divide-y divide-current/15 text-lg">
            {lines.map((line, i) => (
              <li key={i} className="py-3">
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
        <section className="mx-auto max-w-xl px-6 py-20 text-center">
          <h2 className="text-4xl" style={{ fontFamily: "var(--inv-font-heading)", color: "var(--inv-primary)" }}>
            {section.title ?? "Venue"}
          </h2>
          {content.locationName && <p className="mt-6 text-xl font-medium">{content.locationName}</p>}
          {content.locationAddress && <p className="mt-1 opacity-80">{content.locationAddress}</p>}
          {query && (
            <a
              className="mt-6 inline-block rounded-lg border border-[var(--inv-primary)] px-5 py-2 text-[var(--inv-primary)] transition hover:bg-[var(--inv-primary)] hover:text-white"
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
      const urls = (section.imageUrls ?? []).map(safeImageUrl).filter((u): u is string => Boolean(u));
      if (urls.length === 0) return null;
      return (
        <section className="mx-auto max-w-4xl px-6 py-20">
          {section.title && (
            <h2 className="mb-8 text-center text-4xl" style={{ fontFamily: "var(--inv-font-heading)", color: "var(--inv-primary)" }}>
              {section.title}
            </h2>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {urls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
            ))}
          </div>
        </section>
      );
    }

    case "rsvp":
      return (
        <section id="rsvp" className="mx-auto max-w-xl px-6 py-24 text-center">
          <h2 className="mb-8 text-4xl" style={{ fontFamily: "var(--inv-font-heading)", color: "var(--inv-primary)" }}>
            {section.title ?? "RSVP"}
          </h2>
          <RsvpForm slug={invitation.slug} fields={invitation.rsvpFields} demo={demo} />
        </section>
      );

    default:
      return null;
  }
}

export default function InvitationView({ invitation, demo = false }: { invitation: PublicInvitation; demo?: boolean }) {
  const { theme } = invitation.content;
  const style = {
    "--inv-primary": safeColor(theme.primaryColor, "#b8860b"),
    "--inv-bg": safeColor(theme.backgroundColor, "#fffaf0"),
    "--inv-font-heading": `${safeFont(theme.fontHeading, '"Playfair Display"')}, Georgia, serif`,
    "--inv-font-body": `${safeFont(theme.fontBody, "Inter")}, system-ui, sans-serif`,
    background: "var(--inv-bg)",
    color: "#2a2118",
    fontFamily: "var(--inv-font-body)",
  } as CSSProperties;

  return (
    <main style={style} className="min-h-screen">
      {invitation.content.sections.map((section) => (
        <Section key={section.id} section={section} invitation={invitation} demo={demo} />
      ))}
      <footer className="px-6 py-10 text-center text-sm opacity-60">
        Made with{" "}
        <a href="/" className="underline">
          Invitation-card.com
        </a>
      </footer>
    </main>
  );
}
