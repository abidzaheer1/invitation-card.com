"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PASSWORD_MIN, checkPassword, type AuthUser } from "@invitation/shared";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { renderGoogleButton } from "@/lib/google";
import PasswordField from "./PasswordField";
import VerifyEmailNotice from "./VerifyEmailNotice";
import { button, cx, field, hint, label } from "./ui";

function Card({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className={cx("rounded-2xl border bg-white p-6", danger ? "border-danger/40" : "border-line")}>
      <h2 className={cx("text-lg font-semibold", danger && "text-danger")}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Message({ kind, children }: { kind: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cx("mt-3 rounded-lg px-3 py-2 text-sm font-medium", kind === "error" ? "bg-danger/10 text-danger" : "bg-sage-deep text-forest")}
    >
      {children}
    </p>
  );
}

const errText = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong. Please try again.");

function ProfileCard({ user }: { user: AuthUser }) {
  const { refreshUser } = useAuth();
  const [name, setName] = useState(user.name ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch("/auth/me", { method: "PATCH", body: { name } });
      await refreshUser();
      setMsg({ kind: "ok", text: "Saved." });
    } catch (err) {
      setMsg({ kind: "error", text: errText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Profile">
      <dl className="mb-4 text-sm">
        <dt className="text-ink-soft">Email</dt>
        <dd className="font-medium">
          {user.email}{" "}
          <span className={cx("ml-1 rounded-full px-2 py-0.5 text-xs font-semibold", user.emailVerified ? "bg-forest text-white" : "bg-marigold/30 text-forest-deep")}>
            {user.emailVerified ? "Confirmed" : "Not confirmed"}
          </span>
        </dd>
        <dt className="mt-3 text-ink-soft">Sign-in methods</dt>
        <dd className="font-medium">{[user.hasPassword && "Email and password", user.hasGoogle && "Google"].filter(Boolean).join(", ")}</dd>
      </dl>
      <form onSubmit={save} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <label htmlFor="acc-name" className={label}>
            Name
          </label>
          <input id="acc-name" className={field} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <button type="submit" disabled={busy || name.trim() === (user.name ?? "")} className={button.dark}>
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
      {msg && <Message kind={msg.kind}>{msg.text}</Message>}
    </Card>
  );
}

function PasswordCard({ user }: { user: AuthUser }) {
  const { emailEnabled } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function change(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const problem = checkPassword(next, user.email);
    if (problem) return setMsg({ kind: "error", text: problem });
    setBusy(true);
    try {
      await apiFetch("/auth/change-password", { method: "POST", body: { currentPassword: current, newPassword: next } });
      setCurrent("");
      setNext("");
      setMsg({ kind: "ok", text: "Password changed. You were signed out on your other devices." });
    } catch (err) {
      setMsg({ kind: "error", text: errText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function emailLink() {
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch("/auth/forgot-password", { method: "POST", body: { email: user.email } });
      setMsg({ kind: "ok", text: `We've emailed a link to ${user.email}. It works for one hour.` });
    } catch (err) {
      setMsg({ kind: "error", text: errText(err) });
    } finally {
      setBusy(false);
    }
  }

  if (!user.hasPassword) {
    return (
      <Card title="Password">
        <p className="text-ink-soft">You sign in with Google. You can also add a password to sign in with your email.</p>
        {emailEnabled ? (
          <button type="button" onClick={emailLink} disabled={busy} className={cx(button.outline, "mt-4")}>
            {busy ? "Sending…" : "Email me a link to set a password"}
          </button>
        ) : (
          <p className={hint}>Email isn&apos;t set up on this server yet.</p>
        )}
        {msg && <Message kind={msg.kind}>{msg.text}</Message>}
      </Card>
    );
  }

  return (
    <Card title="Change password">
      <form onSubmit={change} noValidate className="max-w-sm space-y-4">
        <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
        <PasswordField
          label="New password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN} characters.`}
        />
        <button type="submit" disabled={busy || !current || !next} className={button.dark}>
          {busy ? "Saving…" : "Change password"}
        </button>
      </form>
      {msg && <Message kind={msg.kind}>{msg.text}</Message>}
    </Card>
  );
}

function SessionsCard() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function everywhere() {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/auth/logout-all", { method: "POST" });
      await signOut();
      router.push("/");
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }

  return (
    <Card title="Devices">
      <p className="text-ink-soft">Signed in on a shared or lost device? End every session, including this one.</p>
      <button type="button" onClick={everywhere} disabled={busy} className={cx(button.outline, "mt-4")}>
        {busy ? "Signing out…" : "Sign out on all devices"}
      </button>
      {error && <Message kind="error">{error}</Message>}
    </Card>
  );
}

function DeleteCard({ user }: { user: AuthUser }) {
  const router = useRouter();
  const { googleClientId, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const googleRef = useRef<HTMLDivElement>(null);
  const googleOnly = !user.hasPassword && user.hasGoogle;

  async function remove(body: { password?: string; credential?: string }) {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/auth/me", { method: "DELETE", body });
      await signOut();
      router.push("/");
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }
  const removeRef = useRef(remove);
  removeRef.current = remove;

  useEffect(() => {
    if (!open || !googleOnly || !googleClientId || !googleRef.current) return;
    void renderGoogleButton(googleRef.current, googleClientId, (credential) => removeRef.current({ credential }), "signin_with");
  }, [open, googleOnly, googleClientId]);

  return (
    <Card title="Delete account" danger>
      <p className="text-ink-soft">
        This permanently deletes your account, every invitation, all replies and your uploaded photos and models. Published links stop
        working. It can&apos;t be undone.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className={cx(button.danger, "mt-4")}>
          Delete my account…
        </button>
      ) : googleOnly ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">Confirm with Google to delete your account:</p>
          <div ref={googleRef} className="min-h-[44px]" />
        </div>
      ) : (
        <form
          className="mt-4 max-w-sm space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void remove({ password });
          }}
        >
          <PasswordField label="Enter your password to confirm" value={password} onChange={setPassword} autoComplete="current-password" />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || !password} className={button.danger}>
              {busy ? "Deleting…" : "Delete everything"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={button.ghost}>
              Keep my account
            </button>
          </div>
        </form>
      )}
      {error && <Message kind="error">{error}</Message>}
    </Card>
  );
}

export default function AccountView() {
  const { user, ready, requestSignIn } = useAuth();

  if (!ready) return <main className="mx-auto max-w-2xl px-5 py-12 text-ink-soft">Loading…</main>;

  if (!user || user.isGuest) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-4xl font-semibold text-forest">Account</h1>
        <p className="mt-3 text-ink-soft">Sign in to manage your account.</p>
        <button type="button" className={cx(button.dark, "mt-5")} onClick={() => requestSignIn("general")}>
          Sign in
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-12">
      <h1 className="font-display text-4xl font-semibold text-forest">Account</h1>
      <VerifyEmailNotice />
      <ProfileCard user={user} />
      <PasswordCard user={user} />
      <SessionsCard />
      <DeleteCard user={user} />
    </main>
  );
}
