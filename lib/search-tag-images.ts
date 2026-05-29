import type { FileRecord } from "@/db/schema";
import { isImageFile } from "@/lib/is-image-file";
import { parseDimensionsFromMetadata } from "@/lib/parse-dimensions-from-metadata";

export type TagImageSearchItem = {
  filename: string;
  originalWidth: number | null;
  originalHeight: number | null;
  isPortrait: boolean | null;
  storageKey: string;
};

export function fileToTagImageSearchItem(file: FileRecord): TagImageSearchItem | null {
  if (!isImageFile(file.name, file.contentType)) {
    return null;
  }

  const dims = parseDimensionsFromMetadata(file.metadata);

  return {
    filename: file.name,
    originalWidth: dims?.width ?? null,
    originalHeight: dims?.height ?? null,
    isPortrait: dims ? dims.height > dims.width : null,
    storageKey: file.r2ObjectKey,
  };
}

export function filesToTagImageSearchResults(files: FileRecord[]): TagImageSearchItem[] {
  const out: TagImageSearchItem[] = [];
  for (const file of files) {
    const item = fileToTagImageSearchItem(file);
    if (item) {
      out.push(item);
    }
  }
  return out;
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
