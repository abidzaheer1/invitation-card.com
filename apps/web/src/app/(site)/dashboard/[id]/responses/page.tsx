"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import type { ResponsesPayload } from "@invitation/shared";
import Icon from "@/components/Icon";
import { button, cx } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { buildResponsesCsv } from "@/lib/csv";
import { formatStamp } from "@/lib/format";

const STATUS = {
  ATTENDING: { label: "Attending", cls: "bg-forest text-white" },
  MAYBE: { label: "Maybe", cls: "bg-marigold/30 text-forest-deep" },
  DECLINED: { label: "Can't come", cls: "bg-sage-deep text-ink-soft" },
} as const;

export default function ResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, ready } = useAuth();
  const [data, setData] = useState<ResponsesPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await apiFetch<ResponsesPayload>(`/invitations/${id}/responses`));
    } catch (err) {
      setError(
        err instanceof ApiError && (err.status === 404 || err.status === 401)
          ? "We couldn't find this invitation. It may belong to another account."
          : err instanceof ApiError
            ? err.message
            : "Couldn't load replies.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setError("Sign in to see replies.");
      return;
    }
    load();
  }, [ready, user, load]);

  function download() {
    if (!data) return;
    const blob = new Blob([buildResponsesCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.invitation.slug || "invitation"}-replies.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const summary = data?.summary;
  const stats = summary
    ? [
        { label: "Attending", value: summary.attending, note: `${summary.guestsAttending} guests in total` },
        { label: "Maybe", value: summary.maybe },
        { label: "Can't come", value: summary.declined },
        { label: "Replies", value: summary.total },
      ]
    : [];

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
        <Icon name="arrow-left" size={15} /> My invitations
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold text-forest sm:text-4xl">Replies</h1>
          {data && <p className="mt-1 truncate text-ink-soft">{data.invitation.title || "Untitled invitation"}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} disabled={loading} className={cx(button.outline, button.small)}>
            <Icon name="refresh" size={15} /> {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={download}
            disabled={!data || data.responses.length === 0}
            className={cx(button.dark, button.small)}
          >
            <Icon name="download" size={15} /> Download CSV
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-8 rounded-lg bg-danger/10 px-4 py-3 font-medium text-danger">
          {error}
        </p>
      )}

      {!data && !error && <p className="mt-10 text-ink-soft">Loading replies…</p>}

      {data && (
        <>
          {!data.invitation.published && (
            <p className="mt-6 rounded-lg border border-marigold/60 bg-marigold/10 px-4 py-3">
              This invitation isn&apos;t published yet, so guests can&apos;t reply.{" "}
              <Link href={`/editor/${id}`} className="font-semibold underline">
                Open the editor
              </Link>
            </p>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-white px-4 py-4">
                <dt className="text-sm text-ink-soft">{s.label}</dt>
                <dd className="mt-1 font-display text-3xl font-semibold text-forest">{s.value}</dd>
                {s.note && <p className="text-xs text-ink-soft">{s.note}</p>}
              </div>
            ))}
          </dl>

          {data.responses.length === 0 ? (
            <div className="mt-10 border-t border-line pt-8">
              <h2 className="text-xl font-semibold">No replies yet</h2>
              <p className="mt-2 max-w-md text-ink-soft">
                Share your invitation link and replies will show up here.
              </p>
            </div>
          ) : (
            <ul className="mt-8 border-t border-line">
              {data.responses.map((r) => {
                const extra = data.invitation.rsvpFields.filter((f) => f.id !== "name" && r.answers[f.id]);
                return (
                  <li key={r.id} className="border-b border-line py-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="font-semibold">{r.guestName}</h2>
                      <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS[r.status].cls)}>
                        {STATUS[r.status].label}
                      </span>
                      <span className="text-sm text-ink-soft">{formatStamp(r.createdAt)}</span>
                    </div>
                    {extra.length > 0 && (
                      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                        {extra.map((f) => (
                          <div key={f.id} className="min-w-0">
                            <dt className="text-ink-soft">{f.label}</dt>
                            <dd className="whitespace-pre-wrap break-words">{r.answers[f.id]}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
