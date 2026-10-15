"use client";

import { useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { button, cx } from "./ui";

/** Reminds people with an unconfirmed email to confirm it, and lets them ask for a new link. */
export default function VerifyEmailNotice({ className }: { className?: string }) {
  const { user, emailEnabled, refreshUser } = useAuth();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  if (!user || user.isGuest || user.emailVerified || !emailEnabled) return null;

  async function resend() {
    setError("");
    setState("sending");
    try {
      await apiFetch("/auth/resend-verification", { method: "POST" });
      setState("sent");
    } catch (err) {
      setState("idle");
      setError(err instanceof ApiError ? err.message : "Couldn't send the email. Please try again.");
    }
  }

  return (
    <div role="status" className={cx("rounded-xl border border-marigold/60 bg-marigold/10 px-5 py-4", className)}>
      <p className="font-semibold">Confirm your email address</p>
      <p className="mt-0.5 text-sm text-ink-soft">
        We sent a link to {user.email}. You need to confirm it before you can publish.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={resend} disabled={state !== "idle"} className={cx(button.dark, button.small)}>
          {state === "sending" ? "Sending…" : state === "sent" ? "Sent. Check your inbox" : "Send the link again"}
        </button>
        <button type="button" onClick={() => void refreshUser()} className={cx(button.ghost, button.small)}>
          I&apos;ve confirmed it
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
