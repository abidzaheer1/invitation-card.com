"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { slugify, validateSlug, type InvitationRecord } from "@invitation/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import Icon from "../Icon";
import { button, cx, field, hint, label } from "../ui";

type SlugState = { kind: "idle" } | { kind: "checking" } | { kind: "ok" } | { kind: "bad"; reason: string };

export default function PublishDialog({
  open,
  record,
  title,
  saveNow,
  onClose,
  onUpdated,
}: {
  open: boolean;
  record: InvitationRecord;
  title: string;
  saveNow: () => Promise<boolean>;
  onClose: () => void;
  onUpdated: (patch: Pick<InvitationRecord, "slug" | "published">) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { requestSignIn } = useAuth();
  const [slug, setSlug] = useState(record.slug);
  const [slugState, setSlugState] = useState<SlugState>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setSlug(record.slug);
      setError("");
      setCopied(false);
    }
    // Only reset when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const value = slug.trim().toLowerCase();
    const problem = validateSlug(value);
    if (problem) {
      setSlugState({ kind: "bad", reason: problem });
      return;
    }
    if (value === record.slug) {
      setSlugState({ kind: "ok" });
      return;
    }
    setSlugState({ kind: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<{ available: boolean; reason?: string }>(
          `/invitations/slug-check?slug=${encodeURIComponent(value)}&id=${record.id}`,
          { signal: controller.signal },
        );
        setSlugState(res.available ? { kind: "ok" } : { kind: "bad", reason: res.reason ?? "That link isn't available." });
      } catch {
        if (!controller.signal.aborted) setSlugState({ kind: "idle" });
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, open, record.slug, record.id]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = `${origin}/i/${record.slug}`;

  async function publish() {
    setError("");
    setBusy(true);
    try {
      // Nobody is asked to sign in until this moment.
      const ok = await requestSignIn("publish");
      if (!ok) return;
      if (!(await saveNow())) {
        setError("We couldn't save your latest changes. Please try again.");
        return;
      }
      const value = slug.trim().toLowerCase();
      const body: { published: true; slug?: string } = { published: true };
      if (value !== record.slug) body.slug = value;
      const res = await apiFetch<InvitationRecord>(`/invitations/${record.id}`, { method: "PATCH", body });
      onUpdated({ slug: res.slug, published: res.published });
    } catch (err) {
      if (err instanceof ApiError && err.code === "ACCOUNT_REQUIRED") setError("Please sign in to publish.");
      else setError(err instanceof ApiError ? err.message : "Couldn't publish. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    setError("");
    setBusy(true);
    try {
      const res = await apiFetch<InvitationRecord>(`/invitations/${record.id}`, { method: "PATCH", body: { published: false } });
      onUpdated({ slug: res.slug, published: res.published });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't unpublish. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the link and copy it by hand.");
    }
  }

  const shareText = encodeURIComponent(`${title || "You're invited"}\n${link}`);

  return (
    <dialog
      ref={ref}
      aria-label={record.published ? "Share your invitation" : "Publish your invitation"}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-line bg-white p-0 text-ink backdrop:bg-forest-deep/60"
    >
      {open && (
        <div className="relative p-6 sm:p-7">
          <button type="button" aria-label="Close" onClick={() => ref.current?.close()} className="absolute right-3 top-3 rounded-lg p-2 text-ink-soft hover:bg-sage-deep">
            <Icon name="x" size={18} />
          </button>

          {record.published ? (
            <>
              <h2 className="font-display text-3xl font-semibold text-forest">Your invitation is live</h2>
              <p className="mt-2 text-ink-soft">Send this link to your guests. Changes you make in the editor go live within a few seconds.</p>
              <div className="mt-5 flex items-center gap-2 rounded-lg border border-line bg-sage px-3 py-2.5">
                <code className="min-w-0 flex-1 truncate text-sm" data-testid="share-link">
                  {link}
                </code>
                <button type="button" onClick={copy} className={cx(button.dark, button.small)}>
                  <Icon name={copied ? "check" : "copy"} size={15} /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer" className={cx(button.outline, button.small)}>
                  <Icon name="share" size={15} /> WhatsApp
                </a>
                <a href={`/i/${record.slug}`} target="_blank" rel="noopener noreferrer" className={cx(button.outline, button.small)}>
                  <Icon name="external" size={15} /> Open page
                </a>
                <Link href={`/dashboard/${record.id}/responses`} className={cx(button.outline, button.small)}>
                  <Icon name="list" size={15} /> See replies
                </Link>
              </div>
              <div className="mt-6 border-t border-line pt-4">
                <button type="button" disabled={busy} onClick={unpublish} className={cx(button.ghost, button.small)}>
                  {busy ? "Working…" : "Unpublish (guests will see an error page)"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-3xl font-semibold text-forest">Publish your invitation</h2>
              <p className="mt-2 text-ink-soft">
                Choose the link guests will open. You&apos;ll be asked to sign in or create an account so your invitation and replies stay yours.
              </p>
              <div className="mt-5">
                <label className={label} htmlFor="p-slug">
                  Your link
                </label>
                <div className="flex items-center overflow-hidden rounded-lg border border-line focus-within:border-forest-soft">
                  <span className="shrink-0 bg-sage px-3 py-2.5 text-sm text-ink-soft">{origin.replace(/^https?:\/\//, "")}/i/</span>
                  <input
                    id="p-slug"
                    className="min-w-0 flex-1 px-3 py-2.5 outline-none"
                    value={slug}
                    maxLength={60}
                    spellCheck={false}
                    autoCapitalize="none"
                    onChange={(e) => setSlug(e.target.value)}
                    aria-describedby="p-slug-hint"
                  />
                </div>
                <p id="p-slug-hint" className={cx(hint, slugState.kind === "bad" && "font-medium text-danger")} role={slugState.kind === "bad" ? "alert" : undefined}>
                  {slugState.kind === "bad" && slugState.reason}
                  {slugState.kind === "checking" && "Checking…"}
                  {slugState.kind === "ok" && "This link is available."}
                  {slugState.kind === "idle" && "Lowercase letters, numbers and hyphens."}
                </p>
                {slugState.kind === "bad" && slugify(title).length >= 3 && (
                  <button type="button" className="mt-1 text-sm font-semibold underline" onClick={() => setSlug(`${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`)}>
                    Suggest one
                  </button>
                )}
              </div>
              {error && (
                <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
                  {error}
                </p>
              )}
              <button type="button" onClick={publish} disabled={busy || slugState.kind === "bad" || slugState.kind === "checking"} className={cx(button.primary, "mt-6 w-full")}>
                {busy ? "Publishing…" : "Publish"}
              </button>
            </>
          )}
          {record.published && error && (
            <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
