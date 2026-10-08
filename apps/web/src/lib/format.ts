/** Colors and font names come from user content, so only accept safe values. */
export function safeColor(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
}

export function safeFont(value: string | undefined, fallback: string): string {
  return value && /^[A-Za-z0-9 \-]{1,40}$/.test(value) ? `"${value}"` : fallback;
}

export function safeImageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Event times are wall-clock times at the venue. We ignore any offset and the
 * server's timezone so every guest sees the time the hosts typed in.
 */
export function formatEventDate(iso?: string): string | null {
  if (!iso || iso.length < 16) return null;
  const date = new Date(`${iso.slice(0, 16)}:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}
