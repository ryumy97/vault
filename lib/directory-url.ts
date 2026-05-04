/** App Router href for a file detail page. */
export function hrefForFileId(fileId: string): string {
  return `/files/${fileId}`;
}

/** Authenticated GET route that streams image bytes from R2 for preview. */
export function hrefForFileImage(fileId: string): string {
  return `/files/${fileId}/image`;
}

/** Authenticated GET route that streams file bytes with a download filename. */
export function hrefForFileDownload(fileId: string): string {
  return `/files/${fileId}/download`;
}

/** Authenticated GET route that streams a ZIP of this folder and all descendants. */
export function hrefForDirectoryZipDownload(directoryId: string): string {
  return `/api/directories/${directoryId}/zip`;
}

/** App Router href for a directory row (DB `path` is absolute, e.g. `/docs/a`). Root is `/dir`. */
export function hrefForDirectoryPath(dbPath: string): string {
  if (dbPath === "/") {
    return "/dir";
  }
  return `/dir${dbPath}`;
}

/** Segments for breadcrumb navigation under `/dir` (root is not included). */
export type DirectoryBreadcrumbAncestor = {
  dbPath: string;
  /** Display label (path segment; matches folder name when in sync). */
  label: string;
};

/**
 * Ancestor folders from root to parent of `dbPath`, in order. Empty when `dbPath` is `/` or
 * one segment (direct child of root).
 */
export function directoryBreadcrumbAncestors(dbPath: string): DirectoryBreadcrumbAncestor[] {
  const normalized = dbPath.replace(/\/+$/, "") || "/";
  if (normalized === "/") {
    return [];
  }
  const parts = normalized.slice(1).split("/").filter(Boolean);
  if (parts.length <= 1) {
    return [];
  }
  const out: DirectoryBreadcrumbAncestor[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    const label = parts[i];
    if (label === undefined) {
      break;
    }
    const dbPathSeg = `/${parts.slice(0, i + 1).join("/")}`;
    out.push({ dbPath: dbPathSeg, label });
  }
  return out;
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
