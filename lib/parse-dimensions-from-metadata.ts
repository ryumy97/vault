import type { FileMetadataKv } from "@/db/schema";

export const DIMENSIONS_METADATA_KEY = "Dimensions";
export const ORIGINAL_DIMENSIONS_METADATA_KEY = "Original dimensions";

function parseDimensionString(raw: unknown): { width: number; height: number } | null {
  if (typeof raw !== "string") {
    return null;
  }
  const m = raw.trim().match(/^(\d+)\s*[×x]\s*(\d+)$/i);
  if (!m) {
    return null;
  }
  const width = Number(m[1]);
  const height = Number(m[2]);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    width > 32768 ||
    height > 32768
  ) {
    return null;
  }
  return { width, height };
}

/** Actual pixel size stored at upload (`Dimensions`, from encoded file bytes). */
export function parseDimensionsFromMetadata(
  metadata: FileMetadataKv | null | undefined,
): { width: number; height: number } | null {
  if (!metadata) {
    return null;
  }
  return parseDimensionString(metadata[DIMENSIONS_METADATA_KEY]);
}

/**
 * EXIF-reported pixel size (`Original dimensions`).
 * Falls back to legacy `Dimensions` when older uploads only stored EXIF there.
 */
export function parseOriginalDimensionsFromMetadata(
  metadata: FileMetadataKv | null | undefined,
): { width: number; height: number } | null {
  if (!metadata) {
    return null;
  }
  return parseDimensionString(
    metadata[ORIGINAL_DIMENSIONS_METADATA_KEY] ?? metadata[DIMENSIONS_METADATA_KEY],
  );
}
