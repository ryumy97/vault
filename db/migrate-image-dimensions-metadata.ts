/**
 * Refresh image dimension metadata from R2:
 * - `Original dimensions` ← raw sensor pixels (set once from legacy `Dimensions` if missing)
 * - `Dimensions` ← display-oriented size (EXIF orientation applied)
 *
 * Usage:
 *   yarn db:migrate-image-dimensions
 *   yarn db:migrate-image-dimensions --dry-run
 */

import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

import { getBlobBytesForScript } from "./r2-script";
import { isImageFile } from "../lib/is-image-file";
import {
  buildImageDimensionsMetadata,
  imageDimensionsMetadataNeedsUpdate,
  isImageDimensionsMetadataMigrated,
} from "../lib/migrate-image-dimensions-metadata";
import {
  parseImageDimensionsFromBytes,
  parseRawImageDimensionsFromBytes,
} from "../lib/parse-image-dimensions-from-bytes";
import * as schema from "./schema";
import { files } from "./schema";

config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const dryRun = process.argv.includes("--dry-run");
const db = drizzle({ client: neon(databaseUrl), schema });

async function readDimensionsFromStorage(storageKey: string): Promise<{
  display: { width: number; height: number } | null;
  raw: { width: number; height: number } | null;
}> {
  try {
    const body = await getBlobBytesForScript(storageKey);
    const [display, raw] = await Promise.all([
      parseImageDimensionsFromBytes(body),
      parseRawImageDimensionsFromBytes(body),
    ]);
    return { display, raw };
  } catch (err) {
    console.warn(`  warn: could not read ${storageKey}:`, err);
    return { display: null, raw: null };
  }
}

async function migrateImageDimensionsMetadataRows() {
  const rows = await db.select().from(files);
  const imageRows = rows.filter((file) => isImageFile(file.name, file.contentType));

  let skipped = 0;
  let updated = 0;
  let failed = 0;

  console.log(
    dryRun
      ? `Dry run: checking ${imageRows.length} image file(s)…`
      : `Migrating ${imageRows.length} image file(s)…`,
  );

  for (const file of imageRows) {
    const { display, raw } = await readDimensionsFromStorage(file.r2ObjectKey);
    const nextMetadata = buildImageDimensionsMetadata(
      file.metadata,
      display,
      raw,
    );

    if (!nextMetadata) {
      console.warn(`  skip ${file.name} (${file.id}): no metadata to write`);
      failed += 1;
      continue;
    }

    if (!isImageDimensionsMetadataMigrated(nextMetadata)) {
      console.warn(
        `  skip ${file.name} (${file.id}): could not produce both dimension fields`,
      );
      failed += 1;
      continue;
    }

    if (!imageDimensionsMetadataNeedsUpdate(file.metadata, nextMetadata)) {
      console.log(`  skip ${file.name} (${file.id}): already up to date`);
      skipped += 1;
      continue;
    }

    console.log(`  update ${file.name} (${file.id})`);
    console.log(
      `    Original dimensions: ${nextMetadata["Original dimensions"] ?? "—"}`,
    );
    console.log(`    Dimensions: ${nextMetadata.Dimensions ?? "—"}`);

    if (!dryRun) {
      await db
        .update(files)
        .set({ metadata: nextMetadata, updatedAt: new Date() })
        .where(eq(files.id, file.id));
    }

    updated += 1;
  }

  console.log("");
  console.log(`Done. updated=${updated} skipped=${skipped} failed=${failed}`);
  if (dryRun && updated > 0) {
    console.log("Re-run without --dry-run to apply changes.");
  }
}

migrateImageDimensionsMetadataRows().catch((err) => {
  console.error(err);
  process.exit(1);
});
