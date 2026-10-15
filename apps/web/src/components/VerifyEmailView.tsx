"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { button, cx } from "./ui";

export default function VerifyEmailView({ token }: { token: string }) {
  const { user, ready, refreshUser, requestSignIn } = useAuth();
  const [state, setState] = useState<"working" | "ok" | "error">(token ? "working" : "error");
  const [message, setMessage] = useState(token ? "" : "This link isn't complete. Open it from your email again.");
  const started = useRef(false);

  useEffect(() => {
    // The link works once, so make sure React's development double-run doesn't spend it twice.
    if (!token || started.current) return;
    started.current = true;
    apiFetch("/auth/verify-email", { method: "POST", body: { token } })
      .then(() => setState("ok"))
      .catch((err) => {
        setState("error");
        setMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });
  }, [token]);

  useEffect(() => {
    if (state === "ok" && ready && user) void refreshUser();
  }, [state, ready, user?.id, refreshUser]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="mx-auto max-w-md px-5 py-14">
      <div className="rounded-2xl border border-line bg-white p-6 text-center sm:p-8" aria-live="polite">
        {state === "working" && <p className="text-ink-soft">Confirming your email…</p>}
        {state === "ok" && (
          <>
            <h1 className="font-display text-2xl font-semibold text-forest">Email confirmed</h1>
            <p className="mt-2 text-ink-soft">Thank you. You can publish your invitations now.</p>
            {ready && user && !user.isGuest ? (
              <Link href="/dashboard" className={cx(button.dark, "mt-5")}>
                Go to my invitations
              </Link>
            ) : (
              <button type="button" className={cx(button.dark, "mt-5")} onClick={() => requestSignIn("general")}>
                Sign in
              </button>
            )}
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="font-display text-2xl font-semibold text-forest">We couldn&apos;t confirm that</h1>
            <p role="alert" className="mt-2 text-ink-soft">
              {message}
            </p>
            <p className="mt-2 text-sm text-ink-soft">Sign in and use “Send the link again” to get a fresh link.</p>
            <Link href="/dashboard" className={cx(button.dark, "mt-5")}>
              Go to my invitations
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
