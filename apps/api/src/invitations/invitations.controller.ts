import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../auth/jwt-auth.guard";
import { CreateInvitationDto, SubmitRsvpDto, UpdateInvitationDto } from "./invitations.dto";
import { InvitationsService } from "./invitations.service";

@Controller("invitations")
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvitationDto) {
    return this.invitations.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.invitations.list(user.id);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.invitations.get(id, user.id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateInvitationDto) {
    return this.invitations.update(id, user.id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.invitations.remove(id, user.id);
  }

  @Get(":id/responses")
  responses(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.invitations.listResponses(id, user.id);
  }
}

/** Routes visitors use; no login required. */
@Controller("public/invitations")
export class PublicInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get(":slug")
  get(@Param("slug") slug: string) {
    return this.invitations.getPublic(slug);
  }

  @Post(":slug/rsvp")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  rsvp(@Param("slug") slug: string, @Body() dto: SubmitRsvpDto) {
    return this.invitations.submitRsvp(slug, dto);
  }
}
