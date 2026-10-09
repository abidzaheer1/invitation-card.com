import { DynamicModule, Global, Module } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import { PrismaService } from "./prisma.service";

@Global()
@Module({})
export class PrismaModule {
  /**
   * Pass a ready-made client (for example one backed by an embedded PGlite
   * database) to use it instead of the default PostgreSQL connection.
   */
  static forRoot(client?: PrismaClient): DynamicModule {
    return {
      module: PrismaModule,
      providers: client
        ? [{ provide: PrismaService, useValue: client as PrismaService }]
        : [PrismaService],
      exports: [PrismaService],
    };
  }
}
