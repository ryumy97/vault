/** Extensions we treat as images for preview (aligned with file list icons). */
const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "ico",
  "heic",
  "heif",
  "avif",
]);

function normalizedExtension(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) {
    return "tgz";
  }
  if (lower.endsWith(".tar.bz2")) {
    return "tbz2";
  }
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) {
    return "";
  }
  return filename.slice(dot + 1).toLowerCase();
}

/** Whether we can show an inline image preview for this file. */
export function isImageFile(
  name: string,
  contentType: string | null | undefined,
): boolean {
  const ct = contentType?.toLowerCase().trim();
  if (ct?.startsWith("image/")) {
    return true;
  }
  return IMAGE_EXTENSIONS.has(normalizedExtension(name));
}
