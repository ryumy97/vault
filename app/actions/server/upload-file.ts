"use server";

import { randomUUID } from "node:crypto";

import { putBlob } from "@/blob";
import { createFile, getDirectoryById, listFilesInDirectory } from "@/db/actions";
import type { FileRecord } from "@/db/schema";
import { IS_DEV } from "@/lib/env";

function sanitizeOriginalFileName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "";
  const trimmed = base.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") {
    throw new Error("Invalid file name");
  }
  if (trimmed.length > 255) {
    throw new Error("File name too long");
  }
  return trimmed;
}

function splitStemExt(filename: string): { stem: string; ext: string } {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) {
    return { stem: filename, ext: "" };
  }
  return {
    stem: filename.slice(0, lastDot),
    ext: filename.slice(lastDot),
  };
}

/** Picks `name`, then `name (1)`, `name (2)`, … before the extension. */
function nextAvailableFileName(original: string, taken: Set<string>): string {
  if (!taken.has(original)) {
    return original;
  }
  const { stem, ext } = splitStemExt(original);
  let n = 1;
  for (;;) {
    const candidate = `${stem} (${n})${ext}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
    n += 1;
  }
}

/**
 * Uploads one file into a directory: resolves duplicate display names, stores the object in R2 at
 * `upload/{uuid}/{filename}` (or `dev/...` when `NODE_ENV === "development"`), then inserts a `files` row.
 */
export async function uploadFileToDirectory(
  directoryId: string,
  file: File,
): Promise<FileRecord> {
  const dir = await getDirectoryById(directoryId);
  if (!dir) {
    throw new Error("Directory not found");
  }

  const rawName = sanitizeOriginalFileName(file.name);
  const existing = await listFilesInDirectory(directoryId);
  const taken = new Set(existing.map((f) => f.name));
  const finalName = nextAvailableFileName(rawName, taken);

  const objectId = randomUUID();
  const segment = IS_DEV ? "dev" : "upload";
  const r2ObjectKey = `${segment}/${objectId}/${finalName}`;

  const body = Buffer.from(await file.arrayBuffer());

  await putBlob(r2ObjectKey, body, {
    contentType: file.type || undefined,
  });

  return createFile({
    directoryId,
    name: finalName,
    r2ObjectKey,
    sizeBytes: BigInt(file.size),
    contentType: file.type || undefined,
  });
}
