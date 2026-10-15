import { Injectable, OnModuleDestroy, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ClientMeta, hashSecret, newSecret } from "./tokens";

const DAY = 86_400_000;
const REFRESH_DAYS = { account: 30, guest: 60 };
/** Two tabs can refresh at the same moment. A rotated token used again this soon is not theft. */
const reuseGraceMs = () => Number(process.env.REFRESH_REUSE_GRACE_MS ?? 10_000);

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshMaxAgeMs: number;
}

@Injectable()
export class SessionsService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  onModuleInit() {
    this.cleanupTimer = setInterval(() => void this.cleanup(), 3_600_000);
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  /** Starts a session: a short-lived access token for API calls plus a long-lived refresh token. */
  async issue(user: Pick<User, "id" | "isGuest">, meta: ClientMeta, familyId?: string): Promise<IssuedTokens> {
    const refreshToken = newSecret();
    const maxAgeMs = (user.isGuest ? REFRESH_DAYS.guest : REFRESH_DAYS.account) * DAY;
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSecret(refreshToken),
        familyId: familyId ?? newSecret(12),
        expiresAt: new Date(Date.now() + maxAgeMs),
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });
    return {
      accessToken: this.jwt.sign({ sub: user.id, sid: session.id }),
      refreshToken,
      refreshMaxAgeMs: maxAgeMs,
    };
  }

  /**
   * Swaps a refresh token for a new pair. The old token stops working. If an old token is used again
   * (a sign that it was copied), the whole sign-in family is revoked.
   */
  async rotate(refreshToken: string, meta: ClientMeta): Promise<{ user: User; tokens: IssuedTokens }> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSecret(refreshToken) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Please sign in again");
    }

    const claimed = await this.prisma.session.updateMany({
      where: { id: session.id, rotatedAt: null, revokedAt: null },
      data: { rotatedAt: new Date(), lastUsedAt: new Date() },
    });
    if (claimed.count === 0) {
      const fresh = await this.prisma.session.findUnique({ where: { id: session.id } });
      const justRotated = fresh?.rotatedAt && Date.now() - fresh.rotatedAt.getTime() < reuseGraceMs();
      if (!justRotated) await this.revokeFamily(session.familyId);
      throw new UnauthorizedException("Please sign in again");
    }

    return { user: session.user, tokens: await this.issue(session.user, meta, session.familyId) };
  }

  /** True when the access token's session is still valid. Checked on every request. */
  async isActive(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true, revokedAt: true, expiresAt: true },
    });
    return Boolean(session && session.userId === userId && !session.revokedAt && session.expiresAt > new Date());
  }

  async revokeByRefreshToken(refreshToken: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { tokenHash: hashSecret(refreshToken) } });
    if (session) await this.revokeFamily(session.familyId);
  }

  revokeFamily(familyId: string) {
    return this.prisma.session.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  /** Signs the person out everywhere, optionally keeping the session they are using right now. */
  async revokeAll(userId: string, exceptSessionId?: string): Promise<void> {
    let keepFamily: string | undefined;
    if (exceptSessionId) {
      keepFamily = (await this.prisma.session.findUnique({ where: { id: exceptSessionId } }))?.familyId;
    }
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, ...(keepFamily ? { NOT: { familyId: keepFamily } } : {}) },
      data: { revokedAt: new Date() },
    });
  }

  async cleanup(): Promise<void> {
    try {
      await this.prisma.session.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - DAY) } } });
      await this.prisma.emailToken.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - DAY) } } });
    } catch {
      /* try again next hour */
    }
  }
}
