"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  EVENT_LABELS,
  EVENT_TYPES,
  TEMPLATES,
  createInvitationFromTemplate,
  readableTextOn,
  templatesForEvent,
  type EventType,
  type InvitationRecord,
  type TemplateDef,
} from "@invitation/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import ModelIcon from "./ModelIcon";
import { button, cx } from "./ui";

function TemplatePreview({ template, eventType }: { template: TemplateDef; eventType?: EventType }) {
  const { content } = createInvitationFromTemplate(template.id, eventType);
  const { theme } = template;
  const heading = `"${theme.fontHeading}", Georgia, serif`;
  return (
    <div
      className="relative flex aspect-[3/4] flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-line px-4 text-center"
      style={{ background: theme.backgroundColor, color: theme.textColor }}
      aria-hidden
    >
      <ModelIcon kind={template.model.kind} color={template.model.color ?? theme.primaryColor} size={64} />
      <p className="max-w-[90%] text-xs opacity-80">{content.hosts}</p>
      <p
        className="text-balance text-3xl leading-none"
        style={{
          fontFamily: heading,
          color: theme.primaryColor,
          fontWeight: ["Montserrat", "Poppins", "Inter"].includes(theme.fontHeading) ? 700 : 400,
        }}
      >
        {content.title}
      </p>
      <span className="block h-px w-12 opacity-50" style={{ background: theme.primaryColor }} />
      <span
        className="rounded-md px-4 py-1 text-xs font-semibold"
        style={{ background: theme.primaryColor, color: readableTextOn(theme.primaryColor) }}
      >
        Reply
      </span>
    </div>
  );
}

export default function TemplateGallery({ initialEvent }: { initialEvent?: EventType }) {
  const router = useRouter();
  const { user, ensureSession, requestSignIn } = useAuth();
  const [event, setEvent] = useState<EventType | null>(initialEvent ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const templates = event ? templatesForEvent(event) : TEMPLATES;

  async function create(template: TemplateDef, retried = false): Promise<void> {
    setError("");
    setBusy(template.id);
    try {
      await ensureSession();
      const invitation = await apiFetch<InvitationRecord>("/invitations", {
        method: "POST",
        body: { templateId: template.id, eventType: event ?? undefined },
      });
      router.push(`/editor/${invitation.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && user?.isGuest && !retried) {
        // Guests have a lower limit. Signing in lifts it.
        setBusy(null);
        if (await requestSignIn("general")) return create(template, true);
        setError(err.message);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div>
      <div role="group" aria-label="Filter by event" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
        {[null, ...EVENT_TYPES].map((type) => {
          const active = event === type;
          const count = type ? templatesForEvent(type).length : TEMPLATES.length;
          return (
            <button
              key={type ?? "all"}
              type="button"
              aria-pressed={active}
              onClick={() => setEvent(type)}
              className={cx(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                active ? "border-forest bg-forest text-white" : "border-line bg-white text-ink hover:border-forest-soft",
              )}
            >
              {type ? EVENT_LABELS[type] : "All designs"} <span className={active ? "text-white/70" : "text-ink-soft"}>{count}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-lg bg-danger/10 px-4 py-3 font-medium text-danger">
          {error}
        </p>
      )}

      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {templates.map((template) => (
          <li key={template.id} className="flex flex-col">
            <TemplatePreview template={template} eventType={event ?? undefined} />
            <h3 className="mt-3 font-semibold">{template.name}</h3>
            <p className="mt-0.5 flex-1 text-sm text-ink-soft">{template.description}</p>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => create(template)}
              className={cx(button.outline, button.small, "mt-3 w-full")}
              aria-label={`Use the ${template.name} design`}
            >
              {busy === template.id ? "Creating…" : "Use this design"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
