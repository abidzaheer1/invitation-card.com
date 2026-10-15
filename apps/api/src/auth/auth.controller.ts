import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import type { AuthResponse } from "@invitation/shared";
import { AuthService, type Issued } from "./auth.service";
import {
  ChangePasswordDto,
  DeleteAccountDto,
  ForgotPasswordDto,
  GoogleDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
  UpdateProfileDto,
} from "./auth.dto";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard, OptionalJwtAuthGuard } from "./jwt-auth.guard";
import type { AuthUser } from "./jwt-auth.guard";
import { REFRESH_COOKIE, clearRefreshCookie, clientMeta, readCookie, requireCsrfHeader, setRefreshCookie } from "./tokens";

const OK = { ok: true } as const;

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Puts the refresh token in its cookie and returns the rest as JSON. */
  private reply(res: Response, issued: Issued): AuthResponse {
    setRefreshCookie(res, issued.refreshToken, issued.refreshMaxAgeMs);
    return issued.body;
  }

  @Get("config")
  config() {
    return this.auth.config();
  }

  @Post("guest")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async guest(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.reply(res, await this.auth.createGuest(clientMeta(req)));
  }

  /** Send the guest token to upgrade that guest in place. */
  @Post("register")
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response, @CurrentUser() user?: AuthUser) {
    return this.reply(res, await this.auth.register(dto, user?.id, clientMeta(req)));
  }

  /** Send the guest token to merge that guest's drafts into the account. */
  @Post("login")
  @HttpCode(200)
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response, @CurrentUser() user?: AuthUser) {
    return this.reply(res, await this.auth.login(dto, user?.id, clientMeta(req)));
  }

  @Post("google")
  @HttpCode(200)
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async google(@Body() dto: GoogleDto, @Req() req: Request, @Res({ passthrough: true }) res: Response, @CurrentUser() user?: AuthUser) {
    return this.reply(res, await this.auth.google(dto.credential, user?.id, clientMeta(req)));
  }

  /**
   * Called when a page opens and whenever the short-lived access token runs out.
   * 204 means this browser has no session; 401 means the session ended.
   */
  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    requireCsrfHeader(req);
    const token = readCookie(req, REFRESH_COOKIE);
    if (!token) {
      res.status(204);
      return;
    }
    try {
      return this.reply(res, await this.auth.refresh(token, clientMeta(req)));
    } catch (err) {
      clearRefreshCookie(res);
      throw err;
    }
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    requireCsrfHeader(req);
    await this.auth.logout(readCookie(req, REFRESH_COOKIE));
    clearRefreshCookie(res);
  }

  @Post("logout-all")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logoutEverywhere(user.id);
    clearRefreshCookie(res);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateName(user.id, dto.name);
  }

  @Delete("me")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async deleteMe(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto, @Res({ passthrough: true }) res: Response) {
    await this.auth.deleteAccount(user.id, dto);
    clearRefreshCookie(res);
  }

  @Post("verify-email")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async verifyEmail(@Body() dto: TokenDto) {
    await this.auth.verifyEmail(dto.token);
    return OK;
  }

  @Post("resend-verification")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  async resendVerification(@CurrentUser() user: AuthUser) {
    await this.auth.resendVerification(user.id);
    return OK;
  }

  @Post("forgot-password")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return OK;
  }

  @Post("reset-password")
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return OK;
  }

  @Post("change-password")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.id, user.sid, dto.currentPassword, dto.newPassword);
    return OK;
  }
}
