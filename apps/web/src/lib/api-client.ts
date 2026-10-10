/** Browser-side helpers for talking to the API (same origin, under /api). */

const TOKEN_KEY = "ic_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage can be blocked in private windows */
  }
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

export async function apiFetch<T = unknown>(path: string, init: Init = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

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
