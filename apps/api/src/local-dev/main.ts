import { resolve } from "path";
import { createApp } from "../bootstrap";
import { createEmbeddedPrisma } from "./pglite";

/**
 * Local development without PostgreSQL: the database lives in a plain folder
 * (apps/api/.local-db) and is created on first run. Delete the folder to start fresh.
 */
async function main() {
  const dataDir = resolve(process.env.LOCAL_DB_DIR ?? "./.local-db");
  const { prisma } = await createEmbeddedPrisma(dataDir);
  const app = await createApp(prisma);
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`API (embedded database at ${dataDir}) listening on port ${port}`);
}

main();
