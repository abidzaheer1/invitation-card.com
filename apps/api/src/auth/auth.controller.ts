import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard, OptionalJwtAuthGuard } from "./jwt-auth.guard";
import type { AuthUser } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("guest")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  guest() {
    return this.auth.createGuest();
  }

  @Post("register")
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  register(@Body() dto: RegisterDto, @CurrentUser() user?: AuthUser) {
    return this.auth.register(dto, user?.id);
  }

  @Post("login")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
