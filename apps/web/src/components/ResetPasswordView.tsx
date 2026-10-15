"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PASSWORD_MIN, checkPassword } from "@invitation/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import PasswordField from "./PasswordField";
import { button, cx } from "./ui";

export default function ResetPasswordView({ token }: { token: string }) {
  const router = useRouter();
  const { requestSignIn } = useAuth();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const problem = checkPassword(password);
    if (problem) return setError(problem);
    if (password !== again) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      await apiFetch("/auth/reset-password", { method: "POST", body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-14">
      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
        {!token ? (
          <>
            <h1 className="font-display text-2xl font-semibold text-forest">This link isn&apos;t complete</h1>
            <p className="mt-2 text-ink-soft">Open the link from your email again, or ask for a new one from the sign-in page.</p>
            <button type="button" className={cx(button.dark, "mt-5")} onClick={() => requestSignIn("general")}>
              Go to sign in
            </button>
          </>
        ) : done ? (
          <div role="status">
            <h1 className="font-display text-2xl font-semibold text-forest">Password updated</h1>
            <p className="mt-2 text-ink-soft">You were signed out everywhere for safety. Sign in with your new password.</p>
            <button type="button" className={cx(button.dark, "mt-5")} onClick={() => requestSignIn("general").then((ok) => ok && router.push("/dashboard"))}>
              Sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <h1 className="font-display text-2xl font-semibold text-forest">Choose a new password</h1>
            <PasswordField
              label="New password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              hint={`At least ${PASSWORD_MIN} characters. A few unrelated words works well.`}
            />
            <PasswordField label="Type it again" value={again} onChange={setAgain} autoComplete="new-password" />
            {error && (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className={cx(button.dark, "w-full")}>
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
