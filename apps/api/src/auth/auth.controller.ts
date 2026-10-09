import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { GoogleDto, LoginDto, RegisterDto } from "./auth.dto";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard, OptionalJwtAuthGuard } from "./jwt-auth.guard";
import type { AuthUser } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get("config")
  config() {
    return this.auth.config();
  }

  @Post("guest")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  guest() {
    return this.auth.createGuest();
  }

  /** Send the guest token to upgrade that guest in place. */
  @Post("register")
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  register(@Body() dto: RegisterDto, @CurrentUser() user?: AuthUser) {
    return this.auth.register(dto, user?.id);
  }

  /** Send the guest token to merge that guest's drafts into the account. */
  @Post("login")
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  login(@Body() dto: LoginDto, @CurrentUser() user?: AuthUser) {
    return this.auth.login(dto, user?.id);
  }

  @Post("google")
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  google(@Body() dto: GoogleDto, @CurrentUser() user?: AuthUser) {
    return this.auth.google(dto.credential, user?.id);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
