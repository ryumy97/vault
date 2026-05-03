/** App Router href for a file detail page. */
export function hrefForFileId(fileId: string): string {
  return `/files/${fileId}`;
}

/** Authenticated GET route that streams image bytes from R2 for preview. */
export function hrefForFileImage(fileId: string): string {
  return `/files/${fileId}/image`;
}

/** App Router href for a directory row (DB `path` is absolute, e.g. `/docs/a`). Root is `/dir`. */
export function hrefForDirectoryPath(dbPath: string): string {
  if (dbPath === "/") {
    return "/dir";
  }
  return `/dir${dbPath}`;
}

/** Parent folder path, or `null` when `dbPath` is already root `/`. */
export function parentDirectoryDbPath(dbPath: string): string | null {
  const normalized = dbPath.replace(/\/+$/, "") || "/";
  if (normalized === "/") {
    return null;
  }
  const i = normalized.lastIndexOf("/");
  if (i <= 0) {
    return "/";
  }
  return normalized.slice(0, i) || "/";
}
