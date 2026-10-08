import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthedRequest, AuthUser } from "./jwt-auth.guard";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    return ctx.switchToHttp().getRequest<AuthedRequest>().user;
  },
);
