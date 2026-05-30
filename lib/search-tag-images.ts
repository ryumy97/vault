import type { FileRecord } from "@/db/schema";
import { isImageFile } from "@/lib/is-image-file";
import {
  parseDimensionsFromMetadata,
  parseOriginalDimensionsFromMetadata,
} from "@/lib/parse-dimensions-from-metadata";

export type TagImageSearchItem = {
  filename: string;
  /** From stored upload metadata (`Original dimensions`, raw EXIF sensor pixels). */
  originalWidth: number | null;
  originalHeight: number | null;
  /** From stored upload metadata (`Dimensions`, display-oriented; EXIF orientation applied). */
  width: number | null;
  height: number | null;
  isPortrait: boolean | null;
  storageKey: string;
};

export function fileToTagImageSearchItem(
  file: FileRecord,
): TagImageSearchItem | null {
  if (!isImageFile(file.name, file.contentType)) {
    return null;
  }

  const storedDims = parseDimensionsFromMetadata(file.metadata);
  const originalDims = parseOriginalDimensionsFromMetadata(file.metadata);
  const portraitSource = storedDims ?? originalDims;

  return {
    filename: file.name,
    originalWidth: originalDims?.width ?? null,
    originalHeight: originalDims?.height ?? null,
    width: storedDims?.width ?? null,
    height: storedDims?.height ?? null,
    isPortrait: portraitSource
      ? portraitSource.height > portraitSource.width
      : null,
    storageKey: file.r2ObjectKey,
  };
}

export function filesToTagImageSearchResults(
  files: FileRecord[],
): TagImageSearchItem[] {
  return files
    .map((file) => fileToTagImageSearchItem(file))
    .filter((item): item is TagImageSearchItem => item != null)
    .sort((a, b) =>
      a.filename.localeCompare(b.filename, undefined, { sensitivity: "base" }),
    );
}

export function parseTagSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const raw = searchParams.tag;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").trim();
}

/** Authenticated GET: JSON list of images matching a single tag. */
export function hrefForSearchTagImages(tag: string): string {
  const sp = new URLSearchParams();
  sp.set("tag", tag.trim());
  return `/api/search/images?${sp.toString()}`;
}
