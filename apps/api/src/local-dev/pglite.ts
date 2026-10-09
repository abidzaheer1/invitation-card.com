import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { existsSync, readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";

/** Walks up from this file until it finds prisma/migrations (works from src, dist and dist-test). */
function findMigrationsDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "prisma", "migrations");
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  throw new Error("Could not find prisma/migrations");
}

/**
 * An embedded PostgreSQL (PGlite). Used for tests and for local development
 * without installing PostgreSQL. Never used in production.
 */
export async function createEmbeddedPrisma(dataDir?: string) {
  const pg = new PGlite(dataDir);
  await pg.waitReady;

  const migrationsDir = findMigrationsDir();
  const names = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  await pg.exec(`CREATE TABLE IF NOT EXISTS "_embedded_migrations" (name TEXT PRIMARY KEY)`);
  const done = new Set(
    (await pg.query<{ name: string }>(`SELECT name FROM "_embedded_migrations"`)).rows.map((r) => r.name),
  );
  for (const name of names) {
    if (done.has(name)) continue;
    await pg.exec(readFileSync(join(migrationsDir, name, "migration.sql"), "utf8"));
    await pg.query(`INSERT INTO "_embedded_migrations" (name) VALUES ($1)`, [name]);
  }

  // The adapter bundles its own copy of Prisma's driver types, so the compiler sees two
  // incompatible-looking versions of the same interface. It works at runtime.
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(pg) as never });
  return { prisma, pg };
}
