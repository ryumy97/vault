"use server";

import { randomUUID } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getR2BucketName, getR2Client, headBlob } from "@/blob";
import type { FileMetadataKv } from "@/db";
import {
  createFile,
  getDirectoryById,
  getFileByR2ObjectKey,
  listFilesInDirectory,
} from "@/db/actions";
import { getSession } from "@/lib/auth/session";
import { IS_DEV } from "@/lib/env";
import { sanitizeFileMetadata } from "@/lib/sanitize-file-metadata";

const PRESIGNED_EXPIRES_SEC = 900;

/** Milliseconds since epoch from `File.lastModified` or similar; rejects absurd values. */
function parseSourceFileInstant(ms: number | null | undefined): Date | null {
  if (ms == null || !Number.isFinite(ms)) {
    return null;
  }
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const t = d.getTime();
  const min = Date.UTC(1970, 0, 1);
  const max = Date.UTC(2100, 0, 1);
  if (t < min || t > max) {
    return null;
  }
  return d;
}

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

function assertKeyMatchesFileName(r2ObjectKey: string, finalName: string): boolean {
  const parts = r2ObjectKey.split("/");
  if (parts.length < 3) {
    return false;
  }
  const [seg, uuid, ...nameParts] = parts;
  if (seg !== "upload" && seg !== "dev") {
    return false;
  }
  if (!/^[0-9a-f-]{36}$/i.test(uuid)) {
    return false;
  }
  return nameParts.join("/") === finalName;
}

export type PrepareClientUploadResult =
  | {
      ok: true;
      uploadUrl: string;
      r2ObjectKey: string;
      finalName: string;
      headers: Record<string, string>;
    }
  | { ok: false; error: string };

/**
 * Issues a short-lived presigned PUT URL so the browser uploads bytes directly to R2
 * (no file body through Next.js). Call {@link finalizeClientUpload} after a successful PUT.
 */
export async function prepareClientUpload(
  directoryId: string,
  originalFileName: string,
  contentType: string | undefined,
  byteSize: number,
): Promise<PrepareClientUploadResult> {
  if (!(await getSession())) {
    return { ok: false, error: "Unauthorized." };
  }
  if (!Number.isFinite(byteSize) || byteSize < 0) {
    return { ok: false, error: "Invalid file size." };
  }

  let rawName: string;
  try {
    rawName = sanitizeOriginalFileName(originalFileName);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid file name.",
    };
  }

  const dir = await getDirectoryById(directoryId);
  if (!dir) {
    return { ok: false, error: "Directory not found." };
  }

  const existing = await listFilesInDirectory(directoryId);
  const taken = new Set(existing.map((f) => f.name));
  const finalName = nextAvailableFileName(rawName, taken);

  const objectId = randomUUID();
  const segment = IS_DEV ? "dev" : "upload";
  const r2ObjectKey = `${segment}/${objectId}/${finalName}`;
  const resolvedType = (contentType?.trim() || "application/octet-stream").slice(0, 255);

  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: r2ObjectKey,
    ContentType: resolvedType,
    ContentLength: byteSize,
  });

  let uploadUrl: string;
  try {
    uploadUrl = await getSignedUrl(getR2Client(), command, {
      expiresIn: PRESIGNED_EXPIRES_SEC,
    });
  } catch {
    return { ok: false, error: "Could not create upload URL." };
  }

  return {
    ok: true,
    uploadUrl,
    r2ObjectKey,
    finalName,
    headers: {
      "Content-Type": resolvedType,
    },
  };
}

export type FinalizeClientUploadResult = { ok: true } | { ok: false; error: string };

/** Verifies the object exists in R2 with the expected size, then inserts the `files` row. */
export async function finalizeClientUpload(
  directoryId: string,
  r2ObjectKey: string,
  finalName: string,
  byteSize: number,
  contentType: string | undefined,
  metadata: FileMetadataKv | undefined,
  /** OS / client “created” instant when available (standard `File` in browsers does not expose this). */
  sourceFileCreatedMs: number | null | undefined,
  /** From `File.lastModified` (last write time on the client). */
  sourceFileModifiedMs: number | null | undefined,
): Promise<FinalizeClientUploadResult> {
  const safeMetadata = sanitizeFileMetadata(metadata);
  if (!(await getSession())) {
    return { ok: false, error: "Unauthorized." };
  }

  const dir = await getDirectoryById(directoryId);
  if (!dir) {
    return { ok: false, error: "Directory not found." };
  }

  if (!assertKeyMatchesFileName(r2ObjectKey, finalName)) {
    return { ok: false, error: "Invalid object key." };
  }

  const already = await getFileByR2ObjectKey(r2ObjectKey);
  if (already) {
    return { ok: true };
  }

  const head = await headBlob(r2ObjectKey);
  if (!head || head.contentLength === undefined) {
    return { ok: false, error: "Upload not found in storage." };
  }
  if (head.contentLength !== byteSize) {
    return { ok: false, error: "Uploaded size does not match." };
  }

  const resolvedContentType = (contentType?.trim() || "application/octet-stream").slice(0, 255);

  const sourceFileCreatedAt = parseSourceFileInstant(sourceFileCreatedMs);
  const sourceFileModifiedAt = parseSourceFileInstant(sourceFileModifiedMs);

  try {
    await createFile({
      directoryId,
      name: finalName,
      r2ObjectKey,
      sizeBytes: BigInt(byteSize),
      contentType: resolvedContentType,
      metadata: safeMetadata ?? null,
      sourceFileCreatedAt,
      sourceFileModifiedAt,
    });
  } catch {
    return { ok: false, error: "Could not save file metadata." };
  }

  return { ok: true };
}
