import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { SessionsService } from "./sessions.service";

export interface AuthUser {
  id: string;
  /** The session this request belongs to. */
  sid: string;
}

export type AuthedRequest = Request & { user?: AuthUser };

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const [type, token] = header.split(" ");
  return type === "Bearer" ? token : undefined;
}

interface AccessPayload {
  sub: string;
  sid?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    protected readonly jwt: JwtService,
    protected readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedException("Missing token");
    let payload: AccessPayload;
    try {
      payload = this.jwt.verify<AccessPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
    // A session ends when the person signs out, changes their password, or a guest is merged into an account.
    if (!payload.sid || !(await this.sessions.isActive(payload.sid, payload.sub))) {
      throw new UnauthorizedException("This session is no longer valid");
    }
    req.user = { id: payload.sub, sid: payload.sid };
    return true;
  }
}

/** Attaches req.user when a valid session is present, but never rejects. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractToken(req);
    if (token) {
      try {
        const payload = this.jwt.verify<AccessPayload>(token);
        if (payload.sid && (await this.sessions.isActive(payload.sid, payload.sub))) {
          req.user = { id: payload.sub, sid: payload.sid };
        }
      } catch {
        // an invalid token is treated as no token on optional routes
      }
    }
    return true;
  }
}
