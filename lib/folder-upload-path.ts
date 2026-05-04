const MAX_SEGMENTS = 128;
const MAX_SEGMENT_LEN = 255;

function isValidSegment(seg: string): boolean {
  if (!seg || seg === "." || seg === "..") {
    return false;
  }
  if (seg.includes("/") || seg.includes("\\")) {
    return false;
  }
  if (seg.length > MAX_SEGMENT_LEN) {
    return false;
  }
  return true;
}

/**
 * Split a `File.webkitRelativePath` (directory upload) into parent directory segments and the
 * file basename. Returns `null` if the path is unsafe or too deep.
 */
export function parseFolderFileRelativePath(webkitRelativePath: string): {
  dirSegments: string[];
  fileName: string;
} | null {
  const norm = webkitRelativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = norm.split("/").filter((p) => p.length > 0);
  if (parts.length === 0) {
    return null;
  }
  if (parts.length > MAX_SEGMENTS) {
    return null;
  }
  const fileName = parts[parts.length - 1];
  if (!fileName) {
    return null;
  }
  const dirSegments = parts.slice(0, -1);
  for (const seg of parts) {
    if (!isValidSegment(seg)) {
      return null;
    }
  }
  return { dirSegments, fileName };
}
