function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** "2027-02-12T18:00" -> "20270212T180000" (a floating time, shown at the same clock time everywhere). */
function floating(iso: string, addHours = 0): string {
  const d = new Date(`${iso.slice(0, 16)}:00Z`);
  d.setUTCHours(d.getUTCHours() + addHours);
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15);
}

export function buildIcs(opts: { slug: string; title: string; eventDate: string; location?: string }): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Invitation-card.com//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${opts.slug}@invitation-card.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART:${floating(opts.eventDate)}`,
    `DTEND:${floating(opts.eventDate, 3)}`,
    `SUMMARY:${escapeText(opts.title)}`,
    ...(opts.location ? [`LOCATION:${escapeText(opts.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
