import type { FileMetadataKv } from "@/db/schema";
import {
  DIMENSIONS_METADATA_KEY,
  ORIGINAL_DIMENSIONS_METADATA_KEY,
} from "@/lib/parse-dimensions-from-metadata";

function formatDimensions(dimensions: { width: number; height: number }): string {
  return `${dimensions.width}×${dimensions.height}`;
}

/** True when both dimension metadata keys are populated. */
export function isImageDimensionsMetadataMigrated(
  metadata: FileMetadataKv | null | undefined,
): boolean {
  const original = metadata?.[ORIGINAL_DIMENSIONS_METADATA_KEY];
  const dimensions = metadata?.[DIMENSIONS_METADATA_KEY];
  return (
    typeof original === "string" &&
    original.trim() !== "" &&
    typeof dimensions === "string" &&
    dimensions.trim() !== ""
  );
}

/**
 * Builds dimension metadata from stored values plus freshly read file sizes.
 * - `Original dimensions`: raw EXIF sensor pixels (unchanged when already set)
 * - `Dimensions`: display-oriented size (EXIF orientation applied)
 */
export function buildImageDimensionsMetadata(
  metadata: FileMetadataKv | null | undefined,
  displayDimensions: { width: number; height: number } | null,
  rawDimensions: { width: number; height: number } | null,
): FileMetadataKv | null {
  const next: FileMetadataKv = { ...(metadata ?? {}) };
  const legacyDimensions =
    typeof next[DIMENSIONS_METADATA_KEY] === "string"
      ? next[DIMENSIONS_METADATA_KEY].trim()
      : "";

  if (!next[ORIGINAL_DIMENSIONS_METADATA_KEY]) {
    if (legacyDimensions) {
      next[ORIGINAL_DIMENSIONS_METADATA_KEY] = legacyDimensions;
    } else if (rawDimensions) {
      next[ORIGINAL_DIMENSIONS_METADATA_KEY] = formatDimensions(rawDimensions);
    }
  }

  if (displayDimensions) {
    next[DIMENSIONS_METADATA_KEY] = formatDimensions(displayDimensions);
  }

  return Object.keys(next).length > 0 ? next : null;
}

export function imageDimensionsMetadataNeedsUpdate(
  before: FileMetadataKv | null | undefined,
  after: FileMetadataKv | null | undefined,
): boolean {
  if (!after || !isImageDimensionsMetadataMigrated(after)) {
    return false;
  }

  return (
    before?.[ORIGINAL_DIMENSIONS_METADATA_KEY] !==
      after[ORIGINAL_DIMENSIONS_METADATA_KEY] ||
    before?.[DIMENSIONS_METADATA_KEY] !== after[DIMENSIONS_METADATA_KEY]
  );
}
