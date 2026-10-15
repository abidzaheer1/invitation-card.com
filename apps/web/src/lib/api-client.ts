import type { AuthResponse } from "@invitation/shared";

/**
 * Browser-side helpers for talking to the API (same origin, under /api).
 *
 * The short-lived access token is kept in memory only. Page scripts can't read the long-lived
 * refresh token, which sits in an httpOnly cookie. When the access token runs out, the next
 * request quietly asks for a new one.
 */

let accessToken: string | null = null;

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string | null): void {
  accessToken = token;
}

type SessionListener = (session: AuthResponse | null) => void;
const listeners = new Set<SessionListener>();

/** Lets the auth provider hear about sessions that were renewed or ended behind the scenes. */
export function onSessionChange(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

interface Init {
  method?: string;
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

let refreshing: Promise<AuthResponse | null> | null = null;

/**
 * Asks for a new access token using the refresh cookie. Several callers share one request.
 * Resolves null when there is no session (no cookie, or it has ended).
 */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= (async () => {
    try {
      let res: Response;
      try {
        res = await fetch("/api/auth/refresh", { method: "POST", headers: { "X-IC-CSRF": "1" }, cache: "no-store" });
      } catch {
        throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
      }
      if (res.status === 204) return null;
      if (res.status === 401) {
        // Another tab may have just rotated the cookie. Try once more with whatever cookie we have now.
        await new Promise((r) => setTimeout(r, 250));
        const retry = await fetch("/api/auth/refresh", { method: "POST", headers: { "X-IC-CSRF": "1" }, cache: "no-store" });
        if (retry.ok && retry.status !== 204) return (await retry.json()) as AuthResponse;
        return null;
      }
      if (!res.ok) throw new ApiError(res.status, "Couldn't restore your session.");
      return (await res.json()) as AuthResponse;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing.then((session) => {
    accessToken = session?.accessToken ?? null;
    return session;
  });
}

export async function apiFetch<T = unknown>(path: string, init: Init = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { "X-IC-CSRF": "1" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let body: BodyInit | undefined;
  if (init.form) {
    body = init.form;
  } else if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? "GET",
      headers,
      body,
      signal: init.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (init.signal?.aborted) throw err;
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  // The access token expires every 15 minutes. Renew it once and repeat the request.
  // Sign-in style calls have no token to renew, so a 401 there is the real answer.
  if (res.status === 401 && !retried && accessToken && !path.startsWith("/auth/login") && !path.startsWith("/auth/google")) {
    const session = await refreshSession();
    listeners.forEach((l) => l(session));
    if (session) return apiFetch<T>(path, init, true);
  }

  const text = await res.text();
  let data: { message?: string | string[]; code?: string } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }

  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data?.message[0] : data?.message;
    throw new ApiError(res.status, message ?? "Something went wrong. Please try again.", data?.code);
  }
  return data as T;
}
