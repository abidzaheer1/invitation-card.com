"use client";

import { createContext, useContext } from "react";
import type { AuthResponse, AuthUser } from "@invitation/shared";

export type SignInReason = "publish" | "general";

export interface AuthContextValue {
  /** The current person, a guest or a signed-in account. Null until a session exists. */
  user: AuthUser | null;
  /** True once we have checked whether a saved session exists. */
  ready: boolean;
  /** Null when Google sign-in is not set up on the server. */
  googleClientId: string | null;
  /** True when the server can send email (verification and password reset). */
  emailEnabled: boolean;
  /** Returns the current user, quietly starting a guest session if there is none. */
  ensureSession: () => Promise<AuthUser>;
  /** Stores a new session after sign-in or sign-up. */
  completeAuth: (res: AuthResponse) => void;
  /** Reloads the user, for example after confirming an email address. */
  refreshUser: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  /** Opens the sign-in dialog. Resolves true once the person has signed in. */
  requestSignIn: (reason?: SignInReason) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
