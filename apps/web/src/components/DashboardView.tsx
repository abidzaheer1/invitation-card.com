"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EVENT_LABELS, isUploadUrl, type InvitationSummary } from "@invitation/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatShortDate } from "@/lib/format";
import { addressSuffix, invitationUrl } from "@/lib/host";
import Icon from "./Icon";
import { button, cx } from "./ui";

function Row({
  item,
  onDeleted,
}: {
  item: InvitationSummary;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [siteHost, setSiteHost] = useState<string | null>(null);
  const pageUrl = siteHost ? invitationUrl(item.slug, siteHost) : "";

  useEffect(() => {
    setSiteHost(window.location.host);
  }, []);
  const date = formatShortDate(item.eventDate);
  const cover = isUploadUrl(item.coverImageUrl) ? item.coverImageUrl : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(invitationUrl(item.slug, window.location.host));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the address on the invitation page instead.");
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/invitations/${item.id}`, { method: "DELETE" });
      onDeleted(item.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete. Please try again.");
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line py-5">
      <Link
        href={`/editor/${item.id}`}
        className="relative h-[84px] w-[63px] shrink-0 overflow-hidden rounded-lg border border-line"
        style={{ background: item.theme.backgroundColor }}
        aria-label={`Edit ${item.title}`}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: item.theme.primaryColor }}
          />
        )}
      </Link>

      <div className="min-w-0 flex-1 basis-56">
        <h2 className="truncate text-lg font-semibold">
          <Link href={`/editor/${item.id}`} className="hover:underline">
            {item.title || "Untitled invitation"}
          </Link>
        </h2>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              item.published ? "bg-forest text-white" : "bg-sage-deep text-ink-soft",
            )}
          >
            {item.published ? "Live" : "Draft"}
          </span>
          {item.published && siteHost && (
            <span className="max-w-full truncate">{item.slug}.{addressSuffix(siteHost)}</span>
          )}
          <span>{EVENT_LABELS[item.eventType]}</span>
          {date && <span>{date}</span>}
          <span>
            {item.responseCount} {item.responseCount === 1 ? "reply" : "replies"}
          </span>
        </p>
        {error && (
          <p role="alert" className="mt-1 text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/editor/${item.id}`} className={cx(button.dark, button.small)}>
          <Icon name="edit" size={15} /> Edit
        </Link>
        <Link href={`/dashboard/${item.id}/responses`} className={cx(button.outline, button.small)}>
          <Icon name="list" size={15} /> Replies
        </Link>
        {item.published && (
          <>
            <a href={pageUrl || undefined} target="_blank" rel="noopener noreferrer" className={cx(button.outline, button.small)}>
              <Icon name="external" size={15} /> View page
            </a>
            <button type="button" onClick={copy} className={cx(button.outline, button.small)}>
              <Icon name={copied ? "check" : "copy"} size={15} /> {copied ? "Copied" : "Copy address"}
            </button>
          </>
        )}
        {confirming ? (
          <span className="flex items-center gap-2 rounded-lg bg-danger/10 px-2 py-1">
            <span className="text-sm font-medium text-danger">Delete for good?</span>
            <button type="button" disabled={busy} onClick={remove} className={cx(button.danger, button.small)}>
              {busy ? "Deleting…" : "Delete"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={cx(button.ghost, button.small)}>
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={cx(button.ghost, button.small)}
            aria-label={`Delete ${item.title}`}
          >
            <Icon name="trash" size={15} />
          </button>
        )}
      </div>
    </li>
  );
}

export default function DashboardView() {
  const { user, ready, requestSignIn } = useAuth();
  const [items, setItems] = useState<InvitationSummary[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setItems(await apiFetch<InvitationSummary[]>("/invitations"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setItems([]);
      else setError(err instanceof ApiError ? err.message : "Couldn't load your invitations.");
    }
  }, []);

  // Reload when the person changes, for example after signing in merges guest drafts into an account.
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setItems([]);
      return;
    }
    load();
  }, [ready, user, load]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold text-forest sm:text-5xl">My invitations</h1>
        <Link href="/create" className={button.primary}>
          <Icon name="plus" size={17} /> New invitation
        </Link>
      </div>

      {user?.isGuest && items && items.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-marigold/60 bg-marigold/10 px-5 py-4">
          <p className="max-w-xl">
            <span className="font-semibold">You&apos;re working as a guest.</span> Your drafts are saved in this browser.
            Sign in to publish them and open them on any device.
          </p>
          <button type="button" className={button.dark} onClick={() => requestSignIn("general")}>
            Sign in
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-8 rounded-lg bg-danger/10 px-4 py-3 font-medium text-danger">
          {error}{" "}
          <button type="button" className="underline" onClick={load}>
            Try again
          </button>
        </p>
      )}

      {items === null && !error && <p className="mt-10 text-ink-soft">Loading your invitations…</p>}

      {items && items.length === 0 && !error && (
        <div className="mt-12 border-t border-line pt-10">
          <h2 className="text-xl font-semibold">No invitations yet</h2>
          <p className="mt-2 max-w-md text-ink-soft">
            Choose a design and your first draft will appear here. When you publish, we host it as its own webpage on our domain.
          </p>
          <Link href="/create" className={cx(button.dark, "mt-6")}>
            Choose a design
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mt-8 border-t border-line">
          {items.map((item) => (
            <Row key={item.id} item={item} onDeleted={(id) => setItems((cur) => cur?.filter((i) => i.id !== id) ?? cur)} />
          ))}
        </ul>
      )}
    </main>
  );
}
