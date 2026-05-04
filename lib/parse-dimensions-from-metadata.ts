import type { FileMetadataKv } from "@/db/schema";

/**
 * Parses pixel size from upload EXIF metadata (`Dimensions` like `6048×4032`).
 */
export function parseDimensionsFromMetadata(
  metadata: FileMetadataKv | null | undefined,
): { width: number; height: number } | null {
  if (!metadata) {
    return null;
  }
  const raw = metadata.Dimensions;
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
