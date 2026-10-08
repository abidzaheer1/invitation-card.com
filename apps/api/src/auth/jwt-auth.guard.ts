import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

export interface AuthUser {
  id: string;
}

export type AuthedRequest = Request & { user?: AuthUser };

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const [type, token] = header.split(" ");
  return type === "Bearer" ? token : undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(protected readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractToken(req);
    if (!token) throw new UnauthorizedException("Missing token");
    try {
      const payload = this.jwt.verify<{ sub: string }>(token);
      req.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}

/** Attaches req.user when a valid token is present, but never rejects. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractToken(req);
    if (token) {
      try {
        const payload = this.jwt.verify<{ sub: string }>(token);
        req.user = { id: payload.sub };
      } catch {
        // ignore invalid token on optional routes
      }
    }
    return true;
  }
}
