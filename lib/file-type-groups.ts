import { fileNameExtension } from "@/lib/file-name-extension";

export type FileTypeGroupId =
  | "images"
  | "videos"
  | "pdfs"
  | "documents"
  | "spreadsheets"
  | "presentations"
  | "zip";

const EXTENSION_SETS: Record<FileTypeGroupId, ReadonlySet<string>> = {
  images: new Set([
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "bmp",
    "svg",
    "ico",
    "tiff",
    "tif",
    "heic",
    "heif",
    "avif",
    "raw",
    "cr2",
    "nef",
    "arw",
    "dng",
  ]),
  videos: new Set([
    "mp4",
    "webm",
    "mov",
    "avi",
    "mkv",
    "m4v",
    "wmv",
    "flv",
    "mpeg",
    "mpg",
    "m2ts",
    "mts",
    "3gp",
    "ogv",
  ]),
  pdfs: new Set(["pdf"]),
  documents: new Set(["doc", "docx", "odt", "rtf", "txt", "md", "pages", "epub"]),
  spreadsheets: new Set(["xls", "xlsx", "ods", "csv", "tsv", "numbers"]),
  presentations: new Set(["ppt", "pptx", "odp", "key"]),
  zip: new Set([
    "zip",
    "rar",
    "7z",
    "tar",
    "gz",
    "gzip",
    "bz2",
    "xz",
    "tgz",
    "tbz2",
    "lz",
    "lzma",
    "zst",
    "cab",
  ]),
};

/** Ordered options for directory filters (matches product grouping). */
export const FILE_TYPE_GROUPS: readonly { id: FileTypeGroupId; label: string }[] = [
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
  { id: "pdfs", label: "PDFs" },
  { id: "documents", label: "Documents" },
  { id: "spreadsheets", label: "Spreadsheets" },
  { id: "presentations", label: "Presentations" },
  { id: "zip", label: "Zip" },
];

const FILE_TYPE_GROUP_LABEL_BY_ID: Record<FileTypeGroupId, string> = FILE_TYPE_GROUPS.reduce(
  (acc, group) => {
    acc[group.id] = group.label;
    return acc;
  },
  {} as Record<FileTypeGroupId, string>,
);

export function fileMatchesTypeGroup(fileName: string, group: FileTypeGroupId): boolean {
  const ext = fileNameExtension(fileName);
  if (ext === "") {
    return false;
  }
  return EXTENSION_SETS[group].has(ext);
}

export function isFileTypeGroupId(value: string): value is FileTypeGroupId {
  return value in EXTENSION_SETS;
}

export function fileTypeGroupForName(fileName: string): FileTypeGroupId | null {
  for (const group of FILE_TYPE_GROUPS) {
    if (fileMatchesTypeGroup(fileName, group.id)) {
      return group.id;
    }
  }
  return null;
}

export function fileTypeGroupLabelForName(fileName: string): string | null {
  const group = fileTypeGroupForName(fileName);
  return group ? FILE_TYPE_GROUP_LABEL_BY_ID[group] : null;
}
