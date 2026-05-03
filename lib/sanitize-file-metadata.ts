import type { FileMetadataKv } from "@/db/schema";

const MAX_KEYS = 80;
const MAX_KEY_LEN = 64;
const MAX_STR_LEN = 1024;

/** Clamp client-supplied metadata before persisting (keys/values only, bounded size). */
export function sanitizeFileMetadata(input: unknown): FileMetadataKv | undefined {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return undefined;
  }

  const out: FileMetadataKv = {};
  let n = 0;

  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (n >= MAX_KEYS) {
      break;
    }
    const key = String(k).slice(0, MAX_KEY_LEN).trim();
    if (!key) {
      continue;
    }

    if (typeof v === "string") {
      const t = v.trim().slice(0, MAX_STR_LEN);
      if (t) {
        out[key] = t;
        n++;
      }
    } else if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = v;
      n++;
    } else if (typeof v === "boolean") {
      out[key] = v;
      n++;
    } else if (v === null) {
      out[key] = null;
      n++;
    }
  }

  return Object.keys(out).length > 0 ? out : undefined;
}
