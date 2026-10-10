import { isHexColor } from "@invitation/shared";

/** Colors come from user content, so only accept safe values. */
export function safeColor(value: string | undefined, fallback: string): string {
  return isHexColor(value) ? value : fallback;
}

function parseWallClock(iso?: string): Date | null {
  if (!iso || iso.length < 16) return null;
  // Event times are wall-clock times at the venue. Reading them as UTC and formatting as UTC
  // keeps every guest on the time the hosts typed, whatever their own timezone is.
  const date = new Date(`${iso.slice(0, 16)}:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatEventDate(iso?: string): string | null {
  const date = parseWallClock(iso);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(date);
}

export function formatShortDate(iso?: string): string | null {
  const date = parseWallClock(iso);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
}
