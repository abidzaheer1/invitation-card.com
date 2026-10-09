import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import type { AuthConfig, AuthResponse } from "@invitation/shared";
import * as bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./auth.dto";

// Compared against when an email is unknown, so unknown and wrong-password logins take equally long.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

@Injectable()
export class AuthService {
  private googleClient?: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  config(): AuthConfig {
    return { googleClientId: process.env.GOOGLE_CLIENT_ID || null };
  }

  private toResponse(user: User): AuthResponse {
    return {
      accessToken: this.jwt.sign({ sub: user.id }),
      user: { id: user.id, email: user.email, isGuest: user.isGuest, name: user.name },
    };
  }

  async createGuest(): Promise<AuthResponse> {
    const user = await this.prisma.user.create({ data: { isGuest: true } });
    return this.toResponse(user);
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

  /**
   * Registers a new account. If the caller is currently a guest, the guest
   * account is upgraded in place so their invitations are kept.
   */
  async register(dto: RegisterDto, currentUserId?: string): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("That email already has an account. Sign in instead.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    if (currentUserId) {
      const current = await this.prisma.user.findUnique({ where: { id: currentUserId } });
      if (current?.isGuest) {
        const upgraded = await this.prisma.user.update({
          where: { id: current.id },
          data: { email, passwordHash, name: dto.name, isGuest: false },
        });
        return this.toResponse(upgraded);
      }
    }

    const user = await this.prisma.user.create({
      data: { email, passwordHash, name: dto.name, isGuest: false },
    });
    return this.toResponse(user);
  }

  async login(dto: LoginDto, currentUserId?: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    const valid = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user?.passwordHash || !valid) {
      throw new UnauthorizedException("Wrong email or password");
    }
    await this.mergeGuestInto(currentUserId, user.id);
    return this.toResponse(user);
  }

  async google(credential: string, currentUserId?: string): Promise<AuthResponse> {
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
    const email = payload.email.toLowerCase();

    let user = await this.prisma.user.findUnique({ where: { googleId: payload.sub } });

    if (!user) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      const current = currentUserId
        ? await this.prisma.user.findUnique({ where: { id: currentUserId } })
        : null;

      if (byEmail) {
        // Link Google to the existing account. Password sign-ups are not email-verified, so
        // anyone could have registered this address with a password of their own. Signing in
        // with Google proves the address is yours, so drop an unverified password.
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            googleId: payload.sub,
            emailVerified: true,
            passwordHash: byEmail.emailVerified ? byEmail.passwordHash : null,
            name: byEmail.name ?? payload.name ?? null,
          },
        });
      } else if (current?.isGuest) {
        // Turn the current guest into this Google account, keeping their drafts.
        user = await this.prisma.user.update({
          where: { id: current.id },
          data: {
            email,
            googleId: payload.sub,
            emailVerified: true,
            name: payload.name ?? null,
            isGuest: false,
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: { email, googleId: payload.sub, emailVerified: true, name: payload.name ?? null },
        });
      }
    }

    await this.mergeGuestInto(currentUserId, user.id);
    return this.toResponse(user);
  }

  async me(userId: string): Promise<AuthResponse["user"]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("This session is no longer valid");
    return { id: user.id, email: user.email, isGuest: user.isGuest, name: user.name };
  }
}
