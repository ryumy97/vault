/** Lowercase extension without leading dot, or "" if none (e.g. `archive.tar.gz` → `gz`). */
export function fileNameExtension(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) {
    return "";
  }
  return base.slice(dot + 1).toLowerCase();
}

/** e.g. `.pdf`, or null when there is no extension. */
export function displayFileExtension(fileName: string): string | null {
  const ext = fileNameExtension(fileName);
  return ext ? `.${ext}` : null;
}
