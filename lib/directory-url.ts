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
