"use client";

import { useEffect, useState } from "react";

const UNITS = [
  { key: "days", label: "days" },
  { key: "hours", label: "hours" },
  { key: "minutes", label: "minutes" },
  { key: "seconds", label: "seconds" },
] as const;

/** Counts down to a wall-clock time like "2027-02-12T18:00". */
export default function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const end = Date.parse(target);
  if (Number.isNaN(end)) return null;

  const diff = now === null ? null : end - now;

  if (diff !== null && diff <= 0) {
    return (
      <p className="text-2xl" style={{ fontFamily: "var(--inv-font-heading)", color: "var(--inv-primary)" }}>
        {diff > -86_400_000 ? "It's happening today" : "Thank you for celebrating with us"}
      </p>
    );
  }

  const total = diff === null ? 0 : Math.floor(diff / 1000);
  const values = {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };

  return (
    <div role="timer" aria-label="Time until the event" className="mx-auto grid max-w-md grid-cols-4 gap-2 sm:gap-4">
      {UNITS.map((u) => (
        <div
          key={u.key}
          className="rounded-xl border px-1 py-3 sm:py-4"
          style={{ borderColor: "var(--inv-border)" }}
        >
          <div
            className="text-3xl tabular-nums sm:text-4xl"
            style={{ fontFamily: "var(--inv-font-heading)", color: "var(--inv-primary)" }}
          >
            {diff === null ? "–" : String(values[u.key]).padStart(2, "0")}
          </div>
          <div className="mt-1 text-xs opacity-75 sm:text-sm">{u.label}</div>
        </div>
      ))}
    </div>
  );
}
