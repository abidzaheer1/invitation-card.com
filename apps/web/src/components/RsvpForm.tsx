"use client";

import { useState } from "react";
import type { RsvpField, RsvpStatus } from "@invitation/shared";

type Props = {
  slug: string;
  fields: RsvpField[];
  /** Previews and demos show the flow without sending anything. */
  demo?: boolean;
};

const STATUS_LABELS: { value: RsvpStatus; label: string }[] = [
  { value: "ATTENDING", label: "Joyfully accept" },
  { value: "MAYBE", label: "Maybe" },
  { value: "DECLINED", label: "Regretfully decline" },
];

const INPUT =
  "w-full rounded-lg border border-[var(--inv-border)] bg-[var(--inv-field)] px-4 py-3 text-base text-[color:var(--inv-text)] outline-none focus:border-[var(--inv-primary)] focus:ring-2 focus:ring-[var(--inv-primary)]/30";

export default function RsvpForm({ slug, fields, demo = false }: Props) {
  const [status, setStatus] = useState<RsvpStatus>("ATTENDING");
  const [guestName, setGuestName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const hasNameField = fields.some((f) => f.id === "name");

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = (hasNameField ? answers.name : guestName)?.trim();
    if (!name) {
      setError("Please tell us your name.");
      return;
    }
    if (demo) {
      setState("done");
      return;
    }
    setState("sending");
    try {
      const res = await fetch(`/api/public/invitations/${encodeURIComponent(slug)}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, guestName: name, answers }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
        const message = Array.isArray(body?.message) ? body?.message[0] : body?.message;
        throw new Error(message ?? "Something went wrong. Please try again.");
      }
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-[var(--inv-border)] p-8 text-center" role="status">
        <p className="text-xl font-semibold">Thank you!</p>
        <p className="mt-2 opacity-80">
          {demo
            ? "This is a preview, so nothing was sent. On a published invitation, replies go straight to the hosts."
            : "Your reply has been sent to the hosts."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-lg space-y-5 text-left" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold opacity-80">Your reply</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {STATUS_LABELS.map((s) => (
            <label
              key={s.value}
              className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-medium transition focus-within:ring-2 focus-within:ring-[var(--inv-primary)] focus-within:ring-offset-2 ${
                status === s.value
                  ? "border-[var(--inv-primary)] bg-[var(--inv-primary)] text-[color:var(--inv-on-primary)]"
                  : "border-[var(--inv-border)] hover:border-[var(--inv-primary)]"
              }`}
            >
              <input
                type="radio"
                name={`status-${slug}`}
                value={s.value}
                checked={status === s.value}
                onChange={() => setStatus(s.value)}
                className="sr-only"
              />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>

      {!hasNameField && (
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor={`guestName-${slug}`}>
            Your name
          </label>
          <input
            id={`guestName-${slug}`}
            className={INPUT}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={120}
            autoComplete="name"
          />
        </div>
      )}

      {fields.map((field) => {
        const id = `field-${slug}-${field.id}`;
        const common = { id, value: answers[field.id] ?? "", className: INPUT };
        return (
          <div key={field.id}>
            <label className="mb-1 block text-sm font-semibold" htmlFor={id}>
              {field.label}
              {field.required && status === "ATTENDING" ? " *" : ""}
            </label>
            {field.type === "textarea" ? (
              <textarea {...common} rows={3} maxLength={2000} onChange={(e) => setAnswer(field.id, e.target.value)} />
            ) : field.type === "select" ? (
              <select {...common} onChange={(e) => setAnswer(field.id, e.target.value)}>
                <option value="">Select…</option>
                {(field.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...common}
                type={field.type === "phone" ? "tel" : field.type}
                min={field.type === "number" ? 0 : undefined}
                maxLength={field.type === "number" ? undefined : 2000}
                autoComplete={field.id === "name" ? "name" : undefined}
                onChange={(e) => setAnswer(field.id, e.target.value)}
              />
            )}
          </div>
        );
      })}

      {error && (
        <p className="text-sm font-semibold text-[color:var(--inv-error)]" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-lg bg-[var(--inv-primary)] px-6 py-3 text-base font-semibold text-[color:var(--inv-on-primary)] transition hover:opacity-90 disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "Send reply"}
      </button>
    </form>
  );
}
