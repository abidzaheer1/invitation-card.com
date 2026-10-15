import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionsService } from "./sessions.service";
import { JwtAuthGuard, OptionalJwtAuthGuard } from "./jwt-auth.guard";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret && config.get("NODE_ENV") === "production") {
          throw new Error("JWT_SECRET must be set in production");
        }
        if (secret && config.get("NODE_ENV") === "production" && secret.length < 32) {
          throw new Error("JWT_SECRET must be at least 32 characters in production");
        }
        // Access tokens are short-lived. The refresh cookie (see SessionsService) keeps people signed in.
        return {
          secret: secret ?? "dev-only-secret",
          signOptions: { expiresIn: (config.get<string>("ACCESS_TOKEN_TTL") ?? "15m") as never },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionsService, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [AuthService, SessionsService, JwtAuthGuard, OptionalJwtAuthGuard, JwtModule],
})
export class AuthModule {}
