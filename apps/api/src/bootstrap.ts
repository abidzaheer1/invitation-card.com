import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { PrismaClient } from "@prisma/client";
import { json } from "express";
import helmet from "helmet";
import { mkdirSync } from "fs";
import { resolve } from "path";
import { invitationSlugFromHostname } from "@invitation/shared";
import { AppModule } from "./app.module";

export function uploadsDir(): string {
  return resolve(process.env.UPLOADS_DIR ?? "./uploads");
}

/** Apex site, www, and every invitation subdomain. Localhost is always allowed. */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") return true;

  const listed = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (listed.includes(origin)) return true;

  const root = process.env.ROOT_DOMAIN?.trim().toLowerCase();
  if (!root) return false;
  return host === root || host === `www.${root}` || invitationSlugFromHostname(host, root) !== null;
}

/** Builds the Nest app. Shared by the real server, the embedded-database dev server and the tests. */
export async function createApp(prisma?: PrismaClient): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(prisma), {
    bodyParser: false,
    logger: process.env.NODE_ENV === "test" ? false : undefined,
  });

  // Behind Caddy the real client address arrives in X-Forwarded-For. Without this,
  // every visitor would share one rate-limit bucket (the proxy's address).
  const trust = process.env.TRUST_PROXY ?? (process.env.NODE_ENV === "production" ? "1" : "0");
  if (trust !== "0") app.set("trust proxy", Number.isNaN(Number(trust)) ? trust : Number(trust));

  app.use(helmet());
  app.use(json({ limit: "1mb" }));
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();

  // Uploaded photos and 3D models. File names are random and never change, so cache hard.
  mkdirSync(uploadsDir(), { recursive: true });
  app.useStaticAssets(uploadsDir(), {
    prefix: "/api/uploads/",
    maxAge: "30d",
    immutable: true,
    index: false,
    dotfiles: "deny",
  });

  app.enableCors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  return app;
}
