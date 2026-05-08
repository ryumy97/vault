export const DIRECTORY_VIEW_MODE_COOKIE = "archive_directory_view_mode";

export type DirectoryViewMode = "list" | "grid";

export function parseDirectoryViewMode(value: string | undefined): DirectoryViewMode {
  return value === "grid" ? "grid" : "list";
}
