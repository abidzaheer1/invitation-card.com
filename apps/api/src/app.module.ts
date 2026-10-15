import { DynamicModule, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import type { PrismaClient } from "@prisma/client";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health.controller";
import { TlsController } from "./tls.controller";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { InvitationsModule } from "./invitations/invitations.module";
import { UploadsModule } from "./uploads/uploads.module";

@Module({})
export class AppModule {
  static register(prisma?: PrismaClient): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60_000, limit: 120 }],
          // Tests fire many requests from one address.
          skipIf: () => process.env.DISABLE_THROTTLE === "1",
        }),
        PrismaModule.forRoot(prisma),
        MailModule,
        AuthModule,
        InvitationsModule,
        UploadsModule,
      ],
      controllers: [HealthController, TlsController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    };
  }
}
