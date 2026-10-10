import { Controller, Get, Query, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { invitationSlugFromHostname } from "@invitation/shared";
import { PrismaService } from "./prisma/prisma.service";

/**
 * Caddy asks this before it requests a certificate for an invitation subdomain.
 * Only names that belong to a real invitation (or the sample) are allowed.
 */
@Controller("internal")
@SkipThrottle()
export class TlsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("tls-ask")
  async ask(@Query("domain") domain = "", @Res({ passthrough: true }) res: Response) {
    const slug = invitationSlugFromHostname(domain, process.env.ROOT_DOMAIN);
    if (!slug) {
      res.status(403);
      return { ok: false };
    }
    if (slug === "demo") return { ok: true };

    const found = await this.prisma.invitation.findUnique({ where: { slug }, select: { id: true } });
    if (!found) {
      res.status(403);
      return { ok: false };
    }
    return { ok: true };
  }
}
