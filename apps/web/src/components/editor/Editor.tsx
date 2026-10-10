"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  EventType,
  InvitationContent,
  InvitationRecord,
  InvitationSection,
  Model3DConfig,
  PublicInvitation,
  RsvpField,
} from "@invitation/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import Icon, { type IconName } from "../Icon";
import InvitationView from "../InvitationView";
import PhoneFrame from "../PhoneFrame";
import { button, cx } from "../ui";
import DesignPanel from "./DesignPanel";
import DetailsPanel from "./DetailsPanel";
import FormPanel from "./FormPanel";
import ModelPanel from "./ModelPanel";
import PublishDialog from "./PublishDialog";
import SectionsPanel from "./SectionsPanel";

type Tab = "details" | "sections" | "design" | "3d" | "form";
type SaveState = "saved" | "dirty" | "saving" | "error";

const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: "details", label: "Details", icon: "edit" },
  { id: "sections", label: "Sections", icon: "layers" },
  { id: "design", label: "Design", icon: "sliders" },
  { id: "3d", label: "3D", icon: "cube" },
  { id: "form", label: "Form", icon: "list" },
];

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "All changes saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  error: "Couldn't save. Retrying when you edit.",
};

export default function Editor({ id }: { id: string }) {
  const { user, ready } = useAuth();
  const [record, setRecord] = useState<InvitationRecord | null>(null);
  const [content, setContent] = useState<InvitationContent | null>(null);
  const [fields, setFields] = useState<RsvpField[]>([]);
  const [eventType, setEventType] = useState<EventType>("OTHER");
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("details");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [save, setSave] = useState<SaveState>("saved");
  const [publishOpen, setPublishOpen] = useState(false);

  // The latest edits live in a ref too, so a save always sends the newest data.
  const latest = useRef<{ content: InvitationContent; fields: RsvpField[]; eventType: EventType } | null>(null);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const chain = useRef<Promise<boolean>>(Promise.resolve(true));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFor = useRef<string | null>(null);

  // Load once per invitation. Signing in later (to publish) must not reload the editor.
  useEffect(() => {
    if (!ready || loadedFor.current === id) return;
    if (!user) {
      setLoadError("We couldn't find this invitation in this browser. Start from the designs page.");
      return;
    }
    loadedFor.current = id;
    apiFetch<InvitationRecord>(`/invitations/${id}`)
      .then((r) => {
        setRecord(r);
        setContent(r.content);
        setFields(r.rsvpFields);
        setEventType(r.eventType);
        latest.current = { content: r.content, fields: r.rsvpFields, eventType: r.eventType };
      })
      .catch((err) => {
        loadedFor.current = null;
        setLoadError(
          err instanceof ApiError && (err.status === 404 || err.status === 401)
            ? "We couldn't find this invitation. It may belong to another account, or it was deleted."
            : err instanceof ApiError
              ? err.message
              : "Couldn't open the editor.",
        );
      });
  }, [id, ready, user]);

  const flush = useCallback((): Promise<boolean> => {
    chain.current = chain.current.then(async () => {
      if (savedVersion.current === version.current || !latest.current) return true;
      const sending = version.current;
      setSave("saving");
      try {
        const { content: c, fields: f, eventType: t } = latest.current;
        await apiFetch(`/invitations/${id}`, { method: "PATCH", body: { content: c, rsvpFields: f, eventType: t } });
        savedVersion.current = sending;
        setSave(version.current === sending ? "saved" : "dirty");
        return true;
      } catch (err) {
        setSave("error");
        if (err instanceof ApiError && err.status === 400) setLoadError("");
        return false;
      }
    });
    return chain.current;
  }, [id]);

  const saveNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    return flush();
  }, [flush]);

  const touch = useCallback(
    (next: Partial<{ content: InvitationContent; fields: RsvpField[]; eventType: EventType }>) => {
      if (!latest.current) return;
      latest.current = { ...latest.current, ...next };
      if (next.content) setContent(next.content);
      if (next.fields) setFields(next.fields);
      if (next.eventType) setEventType(next.eventType);
      version.current += 1;
      setSave((s) => (s === "saving" ? s : "dirty"));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        flush();
      }, 900);
    },
    [flush],
  );

  // Save when leaving the tab, and warn if a save is still pending.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (savedVersion.current !== version.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [saveNow]);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        flush();
      }
    },
    [flush],
  );

  const patchContent = useCallback(
    (patch: Partial<InvitationContent>) => {
      if (latest.current) touch({ content: { ...latest.current.content, ...patch } });
    },
    [touch],
  );
  const setSections = useCallback((sections: InvitationSection[]) => patchContent({ sections }), [patchContent]);
  const setModel = useCallback(
    (sectionId: string, model: Model3DConfig) => {
      if (!latest.current) return;
      setSections(latest.current.content.sections.map((s) => (s.id === sectionId ? { ...s, model } : s)));
    },
    [setSections],
  );

  const preview: PublicInvitation | null = useMemo(
    () => (record && content ? { slug: record.slug, eventType, content, rsvpFields: fields } : null),
    [record, content, eventType, fields],
  );

  if (loadError) {
    return (
      <main className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold text-forest">Can&apos;t open this invitation</h1>
        <p className="mt-3 text-ink-soft">{loadError}</p>
        <Link href="/create" className={cx(button.dark, "mt-6")}>
          Choose a design
        </Link>
      </main>
    );
  }
  if (!record || !content || !preview) {
    return <main className="px-5 py-20 text-center text-ink-soft">Opening the editor…</main>;
  }

  const hasRsvp = content.sections.some((s) => s.type === "rsvp");

  return (
    <div className="flex h-[100svh] flex-col bg-sage">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-white px-4 py-2.5">
        <Link href="/dashboard" className={cx(button.ghost, button.small)} aria-label="Back to my invitations">
          <Icon name="arrow-left" size={16} />
          <span className="hidden sm:inline">My invitations</span>
        </Link>
        <p className="min-w-0 flex-1 truncate font-semibold">{content.title || "Untitled invitation"}</p>
        <p role="status" className={cx("hidden text-sm sm:block", save === "error" ? "font-medium text-danger" : "text-ink-soft")}>
          {SAVE_LABEL[save]}
        </p>
        <div className="flex rounded-lg border border-line p-0.5 lg:hidden" role="group" aria-label="Show">
          {(["edit", "preview"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cx("rounded-md px-3 py-1 text-sm font-semibold", view === v ? "bg-forest text-white" : "text-ink-soft")}
            >
              {v === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => saveNow().then(() => setPublishOpen(true))} className={cx(record.published ? button.outline : button.primary, button.small)}>
          {record.published ? "Share" : "Publish"}
        </button>
      </header>
      <p role="status" className={cx("px-4 py-1 text-xs sm:hidden", save === "error" ? "font-medium text-danger" : "text-ink-soft")}>
        {SAVE_LABEL[save]}
      </p>

      <div className="flex min-h-0 flex-1">
        <section className={cx("min-h-0 w-full flex-col border-r border-line bg-white lg:flex lg:w-[26rem] lg:shrink-0", view === "edit" ? "flex" : "hidden")} aria-label="Edit invitation">
          <div role="tablist" aria-label="Editor sections" className="flex border-b border-line">
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                aria-controls="editor-panel"
                onClick={() => setTab(t.id)}
                className={cx(
                  "flex flex-1 flex-col items-center gap-0.5 border-b-2 px-1 py-2.5 text-xs font-semibold",
                  tab === t.id ? "border-forest text-forest" : "border-transparent text-ink-soft hover:text-ink",
                )}
              >
                <Icon name={t.icon} size={17} />
                {t.label}
              </button>
            ))}
          </div>
          <div id="editor-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            {tab === "details" && (
              <DetailsPanel content={content} eventType={eventType} onContent={patchContent} onEventType={(t) => touch({ eventType: t })} />
            )}
            {tab === "sections" && <SectionsPanel sections={content.sections} onSections={setSections} />}
            {tab === "design" && <DesignPanel theme={content.theme} onTheme={(patch) => patchContent({ theme: { ...content.theme, ...patch } })} />}
            {tab === "3d" && <ModelPanel sections={content.sections} onModel={setModel} />}
            {tab === "form" && <FormPanel fields={fields} onFields={(f) => touch({ fields: f })} hasRsvp={hasRsvp} />}
          </div>
        </section>

        <section className={cx("min-w-0 flex-1 flex-col lg:flex", view === "preview" ? "flex" : "hidden")} aria-label="Preview">
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="flex rounded-lg border border-line bg-white p-0.5" role="group" aria-label="Preview size">
              {(["phone", "desktop"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={device === d}
                  onClick={() => setDevice(d)}
                  className={cx("flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-semibold", device === d ? "bg-forest text-white" : "text-ink-soft")}
                >
                  <Icon name={d === "phone" ? "phone" : "monitor"} size={15} />
                  {d === "phone" ? "Phone" : "Desktop"}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            {device === "phone" ? (
              <PhoneFrame height="min(760px, calc(100svh - 150px))" width={360}>
                <InvitationView invitation={preview} demo compact />
              </PhoneFrame>
            ) : (
              <div className="mx-auto h-[calc(100svh-150px)] max-w-5xl overflow-y-auto rounded-xl border border-line bg-white">
                <InvitationView invitation={preview} demo />
              </div>
            )}
          </div>
        </section>
      </div>

      <PublishDialog
        open={publishOpen}
        record={record}
        title={content.title}
        saveNow={saveNow}
        onClose={() => setPublishOpen(false)}
        onUpdated={(patch) => setRecord((r) => (r ? { ...r, ...patch } : r))}
      />
    </div>
  );
}
