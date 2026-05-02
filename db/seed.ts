/**
 * Inserts the top-level directory: name `root`, path `/`, no parent.
 * Safe to run repeatedly (`ON CONFLICT (path) DO NOTHING`).
 * Apply migrations first: `yarn db:migrate` or `yarn db:push`.
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import { directories } from "./schema";
import * as schema from "./schema";

config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run the seed");
}

const sql = neon(databaseUrl);
const db = drizzle({ client: sql, schema });

async function seed() {
  await db
    .insert(directories)
    .values({
      parentId: null,
      name: "root",
      path: "/",
    })
    .onConflictDoNothing({ target: directories.path });

  console.log('Seeded directories: root (path "/") if it was missing.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
