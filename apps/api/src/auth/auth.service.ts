import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma, type EmailTokenType, type User } from "@prisma/client";
import { checkPassword, type AuthConfig, type AuthResponse, type AuthUser } from "@invitation/shared";
import * as bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { unlink } from "fs/promises";
import { join } from "path";
import { uploadsDir } from "../bootstrap";
import { MailService } from "../mail/mail.service";
import { passwordChangedMail, resetPasswordMail, verifyEmailMail } from "../mail/mail.templates";
import { PrismaService } from "../prisma/prisma.service";
import { DeleteAccountDto, LoginDto, RegisterDto } from "./auth.dto";
import { SessionsService } from "./sessions.service";
import { ClientMeta, hashSecret, newSecret } from "./tokens";

// Compared against when an email is unknown, so unknown and wrong-password logins take equally long.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

const MAX_FAILED_LOGINS = 10;
const LOCK_MINUTES = 10;
const VERIFY_HOURS = 24;
const RESET_HOURS = 1;
const RESEND_COOLDOWN_MS = 60_000;

/** What the controller needs to answer a sign-in: the JSON body and the refresh token for the cookie. */
export interface Issued {
  body: AuthResponse;
  refreshToken: string;
  refreshMaxAgeMs: number;
}

function toUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    isGuest: user.isGuest,
    name: user.name,
    emailVerified: user.emailVerified,
    hasPassword: Boolean(user.passwordHash),
    hasGoogle: Boolean(user.googleId),
  };
}

@Injectable()
export class AuthService {
  private googleClient?: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly mail: MailService,
  ) {}

  config(): AuthConfig {
    return { googleClientId: process.env.GOOGLE_CLIENT_ID || null, emailEnabled: this.mail.canSend };
  }

  private async start(user: User, meta: ClientMeta): Promise<Issued> {
    const tokens = await this.sessions.issue(user, meta);
    return { body: { accessToken: tokens.accessToken, user: toUser(user) }, ...tokens };
  }

  async createGuest(meta: ClientMeta): Promise<Issued> {
    const user = await this.prisma.user.create({ data: { isGuest: true } });
    return this.start(user, meta);
  }

  /** Moves a guest's invitations and uploads into a real account, then removes the guest. */
  private async mergeGuestInto(guestId: string | undefined, targetId: string): Promise<void> {
    if (!guestId || guestId === targetId) return;
    const guest = await this.prisma.user.findUnique({ where: { id: guestId } });
    if (!guest?.isGuest) return;
    await this.prisma.$transaction([
      this.prisma.invitation.updateMany({ where: { ownerId: guestId }, data: { ownerId: targetId } }),
      this.prisma.upload.updateMany({ where: { ownerId: guestId }, data: { ownerId: targetId } }),
      this.prisma.user.delete({ where: { id: guestId } }),
    ]);
  }

  private checkNewPassword(password: string, email: string | null): void {
    const problem = checkPassword(password, email);
    if (problem) throw new BadRequestException(problem);
  }

  // ---------------------------------------------------------------- sign up, sign in

  /**
   * Registers a new account. If the caller is currently a guest, the guest
   * account is upgraded in place so their invitations are kept.
   */
  async register(dto: RegisterDto, currentUserId: string | undefined, meta: ClientMeta): Promise<Issued> {
    const email = dto.email.toLowerCase();
    this.checkNewPassword(dto.password, email);
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException("That email already has an account. Sign in instead.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const name = dto.name?.trim() || undefined;
    let user: User;
    try {
      const current = currentUserId ? await this.prisma.user.findUnique({ where: { id: currentUserId } }) : null;
      if (current?.isGuest) {
        user = await this.prisma.user.update({
          where: { id: current.id },
          data: { email, passwordHash, name, isGuest: false, passwordChangedAt: new Date() },
        });
        // The guest's old sessions are dropped; the new account starts with a fresh one.
        await this.sessions.revokeAll(user.id);
      } else {
        user = await this.prisma.user.create({
          data: { email, passwordHash, name, isGuest: false, passwordChangedAt: new Date() },
        });
      }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException("That email already has an account. Sign in instead.");
      }
      throw err;
    }

    await this.sendVerification(user).catch(() => undefined);
    return this.start(user, meta);
  }

  async login(dto: LoginDto, currentUserId: string | undefined, meta: ClientMeta): Promise<Issued> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpException(
        "Too many wrong passwords. Try again in a few minutes, or reset your password.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const valid = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user?.passwordHash || !valid) {
      if (user) {
        const failed = user.failedLogins + 1;
        const lock = failed >= MAX_FAILED_LOGINS;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
        });
      }
      throw new UnauthorizedException("Wrong email or password");
    }

    let signedIn = user;
    if (user.failedLogins > 0 || user.lockedUntil) {
      signedIn = await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    }
    await this.mergeGuestInto(currentUserId, signedIn.id);
    return this.start(signedIn, meta);
  }

  // ---------------------------------------------------------------- Google

  private async verifyGoogle(credential: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new ServiceUnavailableException("Google sign-in is not set up yet");
    this.googleClient ??= new OAuth2Client(clientId);

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException("Google sign-in failed. Please try again.");
    }
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException("Your Google account needs a verified email address");
    }
    return { sub: payload.sub, email: payload.email.toLowerCase(), name: payload.name ?? null };
  }

  async google(credential: string, currentUserId: string | undefined, meta: ClientMeta): Promise<Issued> {
    const g = await this.verifyGoogle(credential);

    let user = await this.prisma.user.findUnique({ where: { googleId: g.sub } });

    if (!user) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: g.email } });
      const current = currentUserId ? await this.prisma.user.findUnique({ where: { id: currentUserId } }) : null;

      if (byEmail) {
        // Link Google to the existing account. If the address was never confirmed, someone else may
        // have signed up with it using their own password. Signing in with Google proves the address
        // is yours, so the unconfirmed password is dropped and every session on it is ended.
        const takeover = !byEmail.emailVerified && Boolean(byEmail.passwordHash);
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            googleId: g.sub,
            emailVerified: true,
            passwordHash: takeover ? null : byEmail.passwordHash,
            name: byEmail.name ?? g.name,
          },
        });
        if (takeover) await this.sessions.revokeAll(user.id);
      } else if (current?.isGuest) {
        // Turn the current guest into this Google account, keeping their drafts.
        user = await this.prisma.user.update({
          where: { id: current.id },
          data: { email: g.email, googleId: g.sub, emailVerified: true, name: g.name, isGuest: false },
        });
        await this.sessions.revokeAll(user.id);
      } else {
        user = await this.prisma.user.create({
          data: { email: g.email, googleId: g.sub, emailVerified: true, name: g.name },
        });
      }
    }

    await this.mergeGuestInto(currentUserId, user.id);
    return this.start(user, meta);
  }

  // ---------------------------------------------------------------- sessions

  /** Quietly renews a session. Returns null when this browser has no session at all. */
  async refresh(refreshToken: string, meta: ClientMeta): Promise<Issued> {
    const { user, tokens } = await this.sessions.rotate(refreshToken, meta);
    return { body: { accessToken: tokens.accessToken, user: toUser(user) }, ...tokens };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.sessions.revokeByRefreshToken(refreshToken);
  }

  logoutEverywhere(userId: string) {
    return this.sessions.revokeAll(userId);
  }

  // ---------------------------------------------------------------- profile

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("This session is no longer valid");
    return toUser(user);
  }

  async updateName(userId: string, name: string): Promise<AuthUser> {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { name: name.trim() || null } });
    return toUser(user);
  }

  // ---------------------------------------------------------------- email links

  private async createEmailToken(userId: string, type: EmailTokenType, hours: number): Promise<string> {
    const token = newSecret();
    // Only the newest link works.
    await this.prisma.emailToken.deleteMany({ where: { userId, type, usedAt: null } });
    await this.prisma.emailToken.create({
      data: { userId, type, tokenHash: hashSecret(token), expiresAt: new Date(Date.now() + hours * 3_600_000) },
    });
    return token;
  }

  private async recentlySent(userId: string, type: EmailTokenType): Promise<boolean> {
    const last = await this.prisma.emailToken.findFirst({ where: { userId, type }, orderBy: { createdAt: "desc" } });
    return Boolean(last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS);
  }

  private siteUrl(): string {
    return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  }

  private async sendVerification(user: User): Promise<void> {
    if (!user.email || user.emailVerified || !this.mail.canSend) return;
    const token = await this.createEmailToken(user.id, "VERIFY_EMAIL", VERIFY_HOURS);
    await this.mail.send(user.email, verifyEmailMail(user.name, `${this.siteUrl()}/verify-email?token=${token}`));
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isGuest || !user.email) throw new BadRequestException("Sign in with an email address first.");
    if (user.emailVerified) return;
    if (!this.mail.canSend) throw new ServiceUnavailableException("Email isn't set up on this server yet.");
    if (await this.recentlySent(user.id, "VERIFY_EMAIL")) {
      throw new HttpException("We just sent one. Check your inbox, or wait a minute to ask again.", HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.sendVerification(user);
  }

  /** Finds a link that is still usable, or explains why it is not. */
  private async useToken(token: string, type: EmailTokenType) {
    const row = await this.prisma.emailToken.findUnique({ where: { tokenHash: hashSecret(token) }, include: { user: true } });
    if (!row || row.type !== type || row.usedAt || row.expiresAt <= new Date()) {
      throw new BadRequestException("This link has expired or was already used. Ask for a new one.");
    }
    return row;
  }

  async verifyEmail(token: string): Promise<void> {
    const row = await this.useToken(token, "VERIFY_EMAIL");
    await this.prisma.$transaction([
      this.prisma.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({ where: { id: row.userId }, data: { emailVerified: true } }),
    ]);
  }

  /** Always succeeds from the outside, so the form can't be used to discover who has an account. */
  async forgotPassword(email: string): Promise<void> {
    if (!this.mail.canSend) return;
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.isGuest || !user.email) return;
    if (await this.recentlySent(user.id, "RESET_PASSWORD")) return;
    const token = await this.createEmailToken(user.id, "RESET_PASSWORD", RESET_HOURS);
    await this.mail.send(user.email, resetPasswordMail(user.name, `${this.siteUrl()}/reset-password?token=${token}`));
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const row = await this.useToken(token, "RESET_PASSWORD");
    this.checkNewPassword(password, row.user.email);
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction([
      this.prisma.emailToken.deleteMany({ where: { userId: row.userId, type: "RESET_PASSWORD" } }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          // Opening the emailed link proves they own the mailbox.
          emailVerified: true,
          failedLogins: 0,
          lockedUntil: null,
        },
      }),
    ]);
    await this.sessions.revokeAll(row.userId);
    if (row.user.email) await this.mail.send(row.user.email, passwordChangedMail(row.user.name)).catch(() => undefined);
  }

  async changePassword(userId: string, sessionId: string | undefined, current: string, next: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isGuest) throw new BadRequestException("Create an account first.");
    if (!user.passwordHash) {
      throw new BadRequestException("This account signs in with Google. Use “Set a password” to get an email link.");
    }
    if (!(await bcrypt.compare(current, user.passwordHash))) throw new BadRequestException("Your current password is wrong.");
    if (current === next) throw new BadRequestException("Choose a password you haven't used just now.");
    this.checkNewPassword(next, user.email);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(next, 12), passwordChangedAt: new Date() },
    });
    await this.sessions.revokeAll(userId, sessionId);
    if (user.email) await this.mail.send(user.email, passwordChangedMail(user.name)).catch(() => undefined);
  }

  // ---------------------------------------------------------------- delete account

  /** Removes the account, its invitations, replies and uploaded files. The person must prove who they are first. */
  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (user.passwordHash) {
      if (!dto.password || !(await bcrypt.compare(dto.password, user.passwordHash))) {
        throw new BadRequestException("Enter your password to confirm.");
      }
    } else if (user.googleId) {
      const g = dto.credential ? await this.verifyGoogle(dto.credential) : null;
      if (!g || g.sub !== user.googleId) throw new BadRequestException("Confirm with Google to delete your account.");
    }
    // Guests have nothing to prove: their data is only this browser's drafts.

    const files = await this.prisma.upload.findMany({ where: { ownerId: userId }, select: { filename: true } });
    await this.prisma.user.delete({ where: { id: userId } });
    await Promise.all(files.map((f) => unlink(join(uploadsDir(), f.filename)).catch(() => undefined)));
  }
}
