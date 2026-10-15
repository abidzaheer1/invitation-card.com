"use client";

import { useEffect, useRef, useState } from "react";
import { PASSWORD_MIN, checkPassword, type AuthResponse } from "@invitation/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth, type SignInReason } from "@/lib/auth-context";
import { renderGoogleButton } from "@/lib/google";
import PasswordField from "./PasswordField";
import { button, cx, field, label } from "./ui";

type Mode = "signin" | "signup" | "forgot";

const COPY: Record<SignInReason, Record<Mode, [string, string]>> = {
  publish: {
    signin: ["Sign in to publish", "Your invitation is ready. Sign in and everything you made so far comes with you."],
    signup: ["Create an account to publish", "It takes a few seconds. Your invitation and photos are kept."],
    forgot: ["Reset your password", "We'll email you a link to choose a new one."],
  },
  general: {
    signin: ["Welcome back", "Sign in to see your invitations on this device."],
    signup: ["Create your account", "Save your invitations and publish them when they are ready."],
    forgot: ["Reset your password", "We'll email you a link to choose a new one."],
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
  const { googleClientId, emailEnabled, completeAuth } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const googleRef = useRef<HTMLDivElement>(null);

  const finish = (res: AuthResponse) => {
    completeAuth(res);
    onDone();
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (!googleClientId || mode === "forgot" || !googleRef.current) return;
    let cancelled = false;
    renderGoogleButton(googleRef.current, googleClientId, async (credential) => {
      setError("");
      setBusy(true);
      try {
        finishRef.current(await apiFetch<AuthResponse>("/auth/google", { method: "POST", body: { credential } }));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.");
      } finally {
        setBusy(false);
      }
    }).then((ok) => {
      if (!ok && !cancelled) setError("Google sign-in couldn't load. You can use your email instead.");
    });
    return () => {
      cancelled = true;
    };
  }, [googleClientId, mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (mode === "forgot") {
      setBusy(true);
      try {
        await apiFetch("/auth/forgot-password", { method: "POST", body: { email } });
        setSent(true);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (mode === "signup") {
      const problem = checkPassword(password, email);
      if (problem) return setError(problem);
    }
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

  function switchTo(next: Mode) {
    setMode(next);
    setError("");
    setSent(false);
  }

  const [title, sub] = COPY[reason][mode];

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-forest">{title}</h2>
      <p className="mt-1 text-ink-soft">{sub}</p>

      {googleClientId && mode !== "forgot" && (
        <>
          <div ref={googleRef} className="mt-5 flex min-h-[44px] justify-center" />
          <div className="my-4 flex items-center gap-3 text-sm text-ink-soft" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            or use your email
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      {mode === "forgot" && sent ? (
        <div role="status" className="mt-5 rounded-lg bg-sage-deep px-4 py-4">
          <p className="font-semibold">Check your inbox</p>
          <p className="mt-1 text-sm text-ink-soft">
            If there's an account for {email}, we've sent a link to reset the password. It works for one hour.
          </p>
          <button type="button" className="mt-3 text-sm font-semibold text-forest underline underline-offset-2" onClick={() => switchTo("signin")}>
            Back to sign in
          </button>
        </div>
      ) : (
      <form onSubmit={submit} noValidate className={cx("space-y-4", (!googleClientId || mode === "forgot") && "mt-5")}>
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
        {mode !== "forgot" && (
          <>
            <PasswordField
              id="auth-password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              hint={mode === "signup" ? `At least ${PASSWORD_MIN} characters. A few unrelated words works well.` : undefined}
            />
            {mode === "signin" && emailEnabled && (
              <p className="-mt-2 text-right">
                <button type="button" className="text-sm font-semibold text-forest underline underline-offset-2" onClick={() => switchTo("forgot")}>
                  Forgot password?
                </button>
              </p>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={cx(button.dark, "w-full")}>
          {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </button>
      </form>
      )}

      {mode === "forgot" ? (
        !sent && (
          <p className="mt-5 text-center text-sm text-ink-soft">
            Remembered it?{" "}
            <button type="button" className="font-semibold text-forest underline underline-offset-2" onClick={() => switchTo("signin")}>
              Sign in
            </button>
          </p>
        )
      ) : (
        <p className="mt-5 text-center text-sm text-ink-soft">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-semibold text-forest underline underline-offset-2"
            onClick={() => switchTo(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      )}
    </div>
  );
}
