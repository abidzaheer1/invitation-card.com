"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthConfig, AuthResponse, AuthUser } from "@invitation/shared";
import SignInDialog from "@/components/SignInDialog";
import { ApiError, apiFetch, getToken, setToken } from "./api-client";
import { AuthContext, type AuthContextValue, type SignInReason } from "./auth-context";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ reason: SignInReason } | null>(null);

  const pendingGuest = useRef<Promise<AuthUser> | null>(null);
  const resolveDialog = useRef<((signedIn: boolean) => void) | null>(null);

  // Restore a saved session and learn whether Google sign-in is available.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      apiFetch<AuthConfig>("/auth/config")
        .then((c) => !cancelled && setGoogleClientId(c.googleClientId))
        .catch(() => undefined);

      if (getToken()) {
        try {
          const me = await apiFetch<AuthUser>("/auth/me");
          if (!cancelled) setUser(me);
        } catch (err) {
          // An expired or unknown session is dropped; any other error keeps it for next time.
          if (err instanceof ApiError && err.status === 401) setToken(null);
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completeAuth = useCallback((res: AuthResponse) => {
    setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const ensureSession = useCallback(async (): Promise<AuthUser> => {
    if (user && getToken()) return user;
    pendingGuest.current ??= (async () => {
      try {
        if (getToken()) {
          try {
            const me = await apiFetch<AuthUser>("/auth/me");
            setUser(me);
            return me;
          } catch (err) {
            if (!(err instanceof ApiError && err.status === 401)) throw err;
            setToken(null);
          }
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

  const signOut = useCallback(() => {
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
    () => ({ user, ready, googleClientId, ensureSession, completeAuth, signOut, requestSignIn }),
    [user, ready, googleClientId, ensureSession, completeAuth, signOut, requestSignIn],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SignInDialog open={dialog !== null} reason={dialog?.reason ?? "general"} onClose={closeDialog} />
    </AuthContext.Provider>
  );
}
