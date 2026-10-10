"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthResponse } from "@invitation/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth, type SignInReason } from "@/lib/auth-context";
import { button, cx, field, hint, label } from "./ui";

interface GoogleId {
  initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void;
  renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let gisScript: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  gisScript ??= new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisScript = null;
      reject(new Error("Google sign-in could not load"));
    };
    document.head.appendChild(s);
  });
  return gisScript;
}

type Mode = "signin" | "signup";

const COPY: Record<SignInReason, { signin: [string, string]; signup: [string, string] }> = {
  publish: {
    signin: ["Sign in to publish", "Your invitation is ready. Sign in and everything you made so far comes with you."],
    signup: ["Create an account to publish", "It takes a few seconds. Your invitation and photos are kept."],
  },
  general: {
    signin: ["Welcome back", "Sign in to see your invitations on this device."],
    signup: ["Create your account", "Save your invitations and publish them when they are ready."],
  },
};

export default function SignInForm({
  reason = "general",
  initialMode = "signin",
  onDone,
}: {
  reason?: SignInReason;
  initialMode?: Mode;
  onDone: () => void;
}) {
  const { googleClientId, completeAuth } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const googleRef = useRef<HTMLDivElement>(null);

  const finish = (res: AuthResponse) => {
    completeAuth(res);
    onDone();
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (!googleClientId || !googleRef.current) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !googleRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }) => {
            setError("");
            setBusy(true);
            try {
              finishRef.current(await apiFetch<AuthResponse>("/auth/google", { method: "POST", body: { credential } }));
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.");
            } finally {
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(googleRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: 320,
        });
      })
      .catch(() => !cancelled && setError("Google sign-in couldn't load. You can use your email instead."));
    return () => {
      cancelled = true;
    };
  }, [googleClientId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (mode === "signup" && password.length < 8) return setError("Use at least 8 characters for your password.");
    if (mode === "signin" && !password) return setError("Enter your password.");
    setBusy(true);
    try {
      const res = await apiFetch<AuthResponse>(mode === "signin" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: mode === "signin" ? { email, password } : { email, password, name: name.trim() || undefined },
      });
      finish(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const [title, sub] = COPY[reason][mode];

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-forest">{title}</h2>
      <p className="mt-1 text-ink-soft">{sub}</p>

      {googleClientId && (
        <>
          <div ref={googleRef} className="mt-5 flex min-h-[44px] justify-center" />
          <div className="my-4 flex items-center gap-3 text-sm text-ink-soft" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            or use your email
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={submit} noValidate className={cx("space-y-4", !googleClientId && "mt-5")}>
        {mode === "signup" && (
          <div>
            <label htmlFor="auth-name" className={label}>
              Your name <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <input
              id="auth-name"
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={100}
            />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className={label}>
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className={field}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
          />
        </div>
        <div>
          <label htmlFor="auth-password" className={label}>
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
          {mode === "signup" && <p className={hint}>At least 8 characters.</p>}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={cx(button.dark, "w-full")}>
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="font-semibold text-forest underline underline-offset-2"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
          }}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
