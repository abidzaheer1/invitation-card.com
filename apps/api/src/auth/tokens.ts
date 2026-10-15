import { createHash, randomBytes } from "crypto";
import type { Request, Response } from "express";
import { ForbiddenException } from "@nestjs/common";

export const REFRESH_COOKIE = "ic_rt";
const COOKIE_PATH = "/api/auth";

/** Random URL-safe secret. Only its hash is stored, so a database leak can't be replayed. */
export function newSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function secureCookies(): boolean {
  const flag = process.env.COOKIE_SECURE;
  return flag ? flag === "true" || flag === "1" : process.env.NODE_ENV === "production";
}

/** The refresh token lives in an httpOnly cookie, so page scripts (and any injected script) can't read it. */
export function setRefreshCookie(res: Response, token: string, maxAgeMs: number): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: maxAgeMs,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: COOKIE_PATH });
}

/**
 * Cookie-based endpoints (refresh, sign out) require a custom header. Browsers can't add one to a
 * cross-site request without our permission, so a malicious page can't trigger these.
 */
export function requireCsrfHeader(req: Request): void {
  if (req.headers["x-ic-csrf"] !== "1") throw new ForbiddenException("Missing request header");
}

export interface ClientMeta {
  ip?: string;
  userAgent?: string;
}

export function clientMeta(req: Request): ClientMeta {
  const ua = req.headers["user-agent"];
  return { ip: req.ip, userAgent: typeof ua === "string" ? ua.slice(0, 200) : undefined };
}
