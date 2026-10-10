"use client";

import { buildIcs } from "@/lib/ics";

export default function AddToCalendar({
  slug,
  title,
  eventDate,
  location,
}: {
  slug: string;
  title: string;
  eventDate: string;
  location?: string;
}) {
  function download() {
    const blob = new Blob([buildIcs({ slug, title, eventDate, location })], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="rounded-lg border px-5 py-2.5 text-base font-semibold transition hover:opacity-80"
      style={{ borderColor: "var(--inv-primary)", color: "var(--inv-primary)" }}
    >
      Add to calendar
    </button>
  );
}
