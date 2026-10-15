"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthConfig, AuthResponse, AuthUser } from "@invitation/shared";
import SignInDialog from "@/components/SignInDialog";
import { apiFetch, getToken, onSessionChange, refreshSession, setToken } from "./api-client";
import { AuthContext, type AuthContextValue, type SignInReason } from "./auth-context";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [dialog, setDialog] = useState<{ reason: SignInReason } | null>(null);

  const pendingGuest = useRef<Promise<AuthUser> | null>(null);
  const resolveDialog = useRef<((signedIn: boolean) => void) | null>(null);

  // Restore the session from the refresh cookie and learn what the server offers.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      apiFetch<AuthConfig>("/auth/config")
        .then((c) => {
          if (cancelled) return;
          setGoogleClientId(c.googleClientId);
          setEmailEnabled(c.emailEnabled);
        })
        .catch(() => undefined);

      try {
        const session = await refreshSession();
        if (!cancelled && session) setUser(session.user);
      } catch {
        // The server couldn't be reached. Stay signed out for now; a reload tries again.
      }
      if (!cancelled) setReady(true);
    })();
    // Keeps the screen in step when a request renews or loses the session in the background.
    const stop = onSessionChange((session) => setUser(session?.user ?? null));
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  const completeAuth = useCallback((res: AuthResponse) => {
    setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const me = await apiFetch<AuthUser>("/auth/me");
      setUser(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  const ensureSession = useCallback(async (): Promise<AuthUser> => {
    if (user && getToken()) return user;
    pendingGuest.current ??= (async () => {
      try {
        // A returning visitor may still have a session cookie. Otherwise start a guest quietly.
        const existing = await refreshSession();
        if (existing) {
          setUser(existing.user);
          return existing.user;
        }
        const guest = await apiFetch<AuthResponse>("/auth/guest", { method: "POST" });
        completeAuth(guest);
        return guest.user;
      } finally {
        pendingGuest.current = null;
      }
    })();
    return pendingGuest.current;
  }, [user, completeAuth]);

  const signOut = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      /* the cookie is cleared by the server when it can be reached; clear local state regardless */
    }
    setToken(null);
    setUser(null);
  }, []);

  const requestSignIn = useCallback((reason: SignInReason = "general") => {
    return new Promise<boolean>((resolve) => {
      resolveDialog.current?.(false);
      resolveDialog.current = resolve;
      setDialog({ reason });
    });
  }, []);

  const closeDialog = useCallback((signedIn: boolean) => {
    setDialog(null);
    resolveDialog.current?.(signedIn);
    resolveDialog.current = null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, googleClientId, emailEnabled, ensureSession, completeAuth, refreshUser, signOut, requestSignIn }),
    [user, ready, googleClientId, emailEnabled, ensureSession, completeAuth, refreshUser, signOut, requestSignIn],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SignInDialog open={dialog !== null} reason={dialog?.reason ?? "general"} onClose={closeDialog} />
    </AuthContext.Provider>
  );
}
