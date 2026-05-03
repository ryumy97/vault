import type { LucideIcon } from "lucide-react";
import {
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileMusic,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideoCamera,
  Presentation,
} from "lucide-react";

import { cn } from "@/lib/utils";

const IMAGE_EXT = new Set([
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

const VIDEO_EXT = new Set([
  "mp4",
  "webm",
  "mov",
  "avi",
  "mkv",
  "m4v",
  "wmv",
  "mpeg",
  "mpg",
]);

const AUDIO_EXT = new Set([
  "mp3",
  "wav",
  "ogg",
  "flac",
  "m4a",
  "aac",
  "opus",
  "wma",
  "aiff",
]);

const ARCHIVE_EXT = new Set([
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "tgz",
  "bz2",
  "tbz2",
  "xz",
  "zst",
  "lz4",
]);

const CODE_EXT = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "swift",
  "cs",
  "cpp",
  "cc",
  "cxx",
  "c",
  "h",
  "hpp",
  "vue",
  "svelte",
  "php",
  "sh",
  "bash",
  "zsh",
  "ps1",
  "sql",
  "r",
  "dart",
  "ex",
  "exs",
  "erl",
  "hs",
  "lua",
  "pl",
  "scala",
  "vim",
]);

const DATA_EXT = new Set(["json", "yaml", "yml", "toml", "xml"]);

const TEXT_EXT = new Set([
  "txt",
  "md",
  "mdx",
  "log",
  "env",
  "rst",
  "tex",
  "rtf",
]);

const SHEET_EXT = new Set(["xls", "xlsx", "ods", "csv", "tsv", "numbers"]);

const SLIDE_EXT = new Set(["ppt", "pptx", "key", "odp"]);

const DOC_EXT = new Set(["doc", "docx", "odt", "pdf"]);

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

type IconPick = { Icon: LucideIcon; iconClass: string };

function fromMime(contentType: string | null | undefined): IconPick | null {
  const ct = contentType?.toLowerCase().trim();
  if (!ct) {
    return null;
  }
  if (ct.startsWith("image/")) {
    return {
      Icon: FileImage,
      iconClass: "text-sky-600 dark:text-sky-400",
    };
  }
  if (ct.startsWith("video/")) {
    return {
      Icon: FileVideoCamera,
      iconClass: "text-violet-600 dark:text-violet-400",
    };
  }
  if (ct.startsWith("audio/")) {
    return { Icon: FileMusic, iconClass: "text-emerald-600 dark:text-emerald-400" };
  }
  if (ct === "application/pdf") {
    return { Icon: FileType, iconClass: "text-red-600 dark:text-red-400" };
  }
  if (
    ct.includes("zip") ||
    ct.includes("compressed") ||
    ct.includes("tar") ||
    ct.includes("gzip")
  ) {
    return {
      Icon: FileArchive,
      iconClass: "text-amber-600 dark:text-amber-400",
    };
  }
  if (ct.includes("json") || ct.includes("xml") || ct.includes("yaml")) {
    return { Icon: FileCode, iconClass: "text-cyan-600 dark:text-cyan-400" };
  }
  return null;
}

function fromExtension(ext: string): IconPick {
  if (IMAGE_EXT.has(ext)) {
    return {
      Icon: FileImage,
      iconClass: "text-sky-600 dark:text-sky-400",
    };
  }
  if (VIDEO_EXT.has(ext)) {
    return {
      Icon: FileVideoCamera,
      iconClass: "text-violet-600 dark:text-violet-400",
    };
  }
  if (AUDIO_EXT.has(ext)) {
    return {
      Icon: FileMusic,
      iconClass: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (ARCHIVE_EXT.has(ext) || ext === "tbz2") {
    return {
      Icon: FileArchive,
      iconClass: "text-amber-600 dark:text-amber-400",
    };
  }
  if (SHEET_EXT.has(ext)) {
    return {
      Icon: FileSpreadsheet,
      iconClass: "text-green-600 dark:text-green-400",
    };
  }
  if (SLIDE_EXT.has(ext)) {
    return {
      Icon: Presentation,
      iconClass: "text-orange-600 dark:text-orange-400",
    };
  }
  if (DOC_EXT.has(ext)) {
    return { Icon: FileText, iconClass: "text-blue-600 dark:text-blue-400" };
  }
  if (DATA_EXT.has(ext)) {
    return { Icon: FileCode, iconClass: "text-cyan-600 dark:text-cyan-400" };
  }
  if (CODE_EXT.has(ext)) {
    return {
      Icon: FileCode,
      iconClass: "text-fuchsia-600 dark:text-fuchsia-400",
    };
  }
  if (TEXT_EXT.has(ext)) {
    return {
      Icon: FileText,
      iconClass: "text-slate-600 dark:text-slate-400",
    };
  }
  return {
    Icon: File,
    iconClass: "text-muted-foreground",
  };
}

type FileEntryIconProps = {
  name: string;
  contentType?: string | null;
  className?: string;
};

export function FileEntryIcon({ name, contentType, className }: FileEntryIconProps) {
  const ext = normalizedExtension(name);
  let pick = fromExtension(ext);
  if (pick.Icon === File) {
    const mimePick = fromMime(contentType);
    if (mimePick) {
      pick = mimePick;
    }
  }

  const { Icon, iconClass } = pick;

  return (
    <Icon
      className={cn("size-4 shrink-0", iconClass, className)}
      aria-hidden
    />
  );
}
