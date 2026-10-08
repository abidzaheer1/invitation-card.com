import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import type { AuthResponse } from "@invitation/shared";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

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

  /**
   * Registers a new account. If the caller is currently a guest, the guest
   * account is upgraded in place so their invitations are kept.
   */
  async register(dto: RegisterDto, currentUserId?: string): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");

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

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.toResponse(user);
  }

  async me(userId: string): Promise<AuthResponse["user"]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    return { id: user.id, email: user.email, isGuest: user.isGuest, name: user.name };
  }
}
