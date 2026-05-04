/** Full logical path for a file under a folder `parentPath` (DB path, e.g. `/docs`). */
export function logicalFilePathForZip(parentPath: string, fileName: string): string {
  if (parentPath === "/") {
    return `/${fileName}`;
  }
  return `${parentPath}/${fileName}`;
}

/** Strip `..` and absolute segments so ZIP entries stay relative and safe. */
export function sanitizeZipEntryPath(relative: string): string {
  const norm = relative.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = norm.split("/").filter((s) => s !== "" && s !== "." && s !== "..");
  return segments.join("/");
}

/**
 * Path inside the ZIP relative to the downloaded folder root.
 * `rootDirPath` is the DB path of the folder being exported.
 */
export function relativeZipEntryPath(rootDirPath: string, fileLogicalPath: string): string {
  let relative: string;
  if (rootDirPath === "/") {
    relative = fileLogicalPath.replace(/^\//, "");
  } else {
    const prefix = `${rootDirPath}/`;
    relative = fileLogicalPath.startsWith(prefix)
      ? fileLogicalPath.slice(prefix.length)
      : fileLogicalPath === rootDirPath
        ? ""
        : "";
  }

  return sanitizeZipEntryPath(relative);
}
