import "server-only";

import { eq, ilike, inArray, isNull, like, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import {
  dirByIdTag,
  dirByPathTag,
  dirChildrenTag,
  dirFilesTag,
  fileByIdTag,
} from "@/lib/cache-tags";
import { parentDirectoryDbPath } from "@/lib/directory-url";
import {
  type DirectoryRenameAffected,
  invalidateAfterDirectoryDelete,
  invalidateAfterDirectoryInsert,
  invalidateAfterDirectoryRename,
  invalidateAfterDirectoryUpdate,
  invalidateAfterFileDelete,
  invalidateAfterFileInsert,
  invalidateAfterFileUpdate,
} from "@/lib/invalidate";
import { escapeIlikePattern, SEARCH_PAGE_SIZE } from "@/lib/search";
import { normalizeTags } from "@/lib/tags";

import { db } from "./index";
import {
  type Directory,
  directories,
  type FileRecord,
  files,
  type NewDirectory,
  type NewFileRecord,
} from "./schema";

/* ---------- private raw reads (uncached, for "before" snapshots) ---------- */

async function getDirectoryByIdRaw(id: string): Promise<Directory | undefined> {
  const [row] = await db.select().from(directories).where(eq(directories.id, id)).limit(1);
  return row;
}

async function getFileByIdRaw(id: string): Promise<FileRecord | undefined> {
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  return row;
}

/* ---------- directory: cached reads ---------- */

export async function getDirectoryById(id: string): Promise<Directory | undefined> {
  "use cache";
  cacheLife("max");
  cacheTag(dirByIdTag(id));

  return getDirectoryByIdRaw(id);
}

export async function getDirectoriesByIds(ids: string[]): Promise<Directory[]> {
  if (ids.length === 0) {
    return [];
  }

  return db.select().from(directories).where(inArray(directories.id, ids));
}

export async function getDirectoryByPath(path: string): Promise<Directory | undefined> {
  "use cache";
  cacheLife("max");
  cacheTag(dirByPathTag(path));

  const [row] = await db.select().from(directories).where(eq(directories.path, path)).limit(1);

  return row;
}

export async function listChildDirectories(parentId: string | null): Promise<Directory[]> {
  "use cache";
  cacheLife("max");
  cacheTag(dirChildrenTag(parentId));

  if (parentId === null) {
    return db.select().from(directories).where(isNull(directories.parentId));
  }

  return db.select().from(directories).where(eq(directories.parentId, parentId));
}

/* ---------- directory: mutations (each owns its invalidation) ---------- */

export async function createDirectory(
  values: Pick<NewDirectory, "parentId" | "name" | "path"> & Partial<Pick<NewDirectory, "tags">>,
): Promise<Directory> {
  const [row] = await db
    .insert(directories)
    .values({
      parentId: values.parentId,
      name: values.name,
      path: values.path,
      tags: values.tags ?? [],
    })
    .returning();

  if (!row) {
    throw new Error("createDirectory: insert returned no row");
  }

  invalidateAfterDirectoryInsert(row);
  return row;
}

export async function updateDirectory(
  id: string,
  patch: Partial<Pick<NewDirectory, "name" | "parentId" | "path" | "tags">>,
): Promise<Directory | undefined> {
  if (Object.keys(patch).length === 0) {
    return getDirectoryByIdRaw(id);
  }

  const before = await getDirectoryByIdRaw(id);
  if (!before) {
    return undefined;
  }

  const [after] = await db
    .update(directories)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(directories.id, id))
    .returning();

  if (after) {
    invalidateAfterDirectoryUpdate({ before, after });
  }

  return after;
}

export async function deleteDirectoryById(id: string): Promise<Directory | undefined> {
  const [row] = await db.delete(directories).where(eq(directories.id, id)).returning();

  if (row) {
    invalidateAfterDirectoryDelete(row);
  }

  return row;
}

export type RenameDirectorySegmentResult =
  | { ok: true; newPath: string }
  | { ok: false; error: string };

/**
 * Renames a folder segment and updates `path` for the folder and all descendants.
 * Root (`path` `/`) only updates `name`. Cache invalidation is performed internally.
 */
export async function renameDirectorySegment(
  directoryId: string,
  newSegment: string,
): Promise<RenameDirectorySegmentResult> {
  const trimmed = newSegment.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") {
    return { ok: false, error: "Invalid name." };
  }
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return { ok: false, error: "Name cannot contain slashes." };
  }
  if (trimmed.length > 255) {
    return { ok: false, error: "Name too long." };
  }

  const dir = await getDirectoryByIdRaw(directoryId);
  if (!dir) {
    return { ok: false, error: "Folder not found." };
  }

  if (dir.path === "/") {
    if (trimmed === dir.name) {
      return { ok: true, newPath: "/" };
    }
    const roots = await listChildDirectories(null);
    if (roots.some((r) => r.id !== dir.id && r.name === trimmed)) {
      return { ok: false, error: "A folder with that name already exists here." };
    }
    await db
      .update(directories)
      .set({ name: trimmed, updatedAt: new Date() })
      .where(eq(directories.id, directoryId));

    invalidateAfterDirectoryRename([{ id: dir.id, parentId: null, oldPath: "/", newPath: "/" }]);
    return { ok: true, newPath: "/" };
  }

  const oldPath = dir.path;
  const parentPath = parentDirectoryDbPath(oldPath);
  if (parentPath === null) {
    return { ok: false, error: "Invalid folder path." };
  }

  const newPath = parentPath === "/" ? `/${trimmed}` : `${parentPath}/${trimmed}`;

  if (newPath === oldPath && trimmed === dir.name) {
    return { ok: true, newPath };
  }

  if (!dir.parentId) {
    return { ok: false, error: "Invalid parent folder." };
  }

  const siblings = await listChildDirectories(dir.parentId);
  if (siblings.some((s) => s.id !== dir.id && s.name === trimmed)) {
    return { ok: false, error: "A folder with that name already exists here." };
  }

  const atPath = await getDirectoryByPath(newPath);
  if (atPath && atPath.id !== dir.id) {
    return { ok: false, error: "That path is already in use." };
  }

  const rows = await db
    .select()
    .from(directories)
    .where(or(eq(directories.path, oldPath), like(directories.path, `${oldPath}/%`)));

  const sorted = [...rows].sort((a, b) => b.path.length - a.path.length);

  const affected: DirectoryRenameAffected[] = sorted.map((r) => ({
    id: r.id,
    parentId: r.parentId ?? null,
    oldPath: r.path,
    newPath: r.id === directoryId ? newPath : newPath + r.path.slice(oldPath.length),
  }));

  for (const row of affected) {
    const patch: { path: string; name?: string; updatedAt: Date } = {
      path: row.newPath,
      updatedAt: new Date(),
    };
    if (row.id === directoryId) {
      patch.name = trimmed;
    }
    await db.update(directories).set(patch).where(eq(directories.id, row.id));
  }

  invalidateAfterDirectoryRename(affected);
  return { ok: true, newPath };
}

/* ---------- file: cached reads ---------- */

export async function getFileById(id: string): Promise<FileRecord | undefined> {
  "use cache";
  cacheLife("max");
  cacheTag(fileByIdTag(id));

  return getFileByIdRaw(id);
}

export async function getFileByR2ObjectKey(r2ObjectKey: string): Promise<FileRecord | undefined> {
  const [row] = await db.select().from(files).where(eq(files.r2ObjectKey, r2ObjectKey)).limit(1);

  return row;
}

export async function listFilesInDirectory(directoryId: string): Promise<FileRecord[]> {
  "use cache";
  cacheLife("max");
  cacheTag(dirFilesTag(directoryId));

  return db.select().from(files).where(eq(files.directoryId, directoryId));
}

/** Files stored in this folder or any descendant folder (by DB path prefix). */
export async function listFilesInDirectorySubtree(rootDir: Directory): Promise<FileRecord[]> {
  const rootPath = rootDir.path;
  const dirRows = await db
    .select({ id: directories.id })
    .from(directories)
    .where(or(eq(directories.path, rootPath), like(directories.path, `${rootPath}/%`)));

  const ids = dirRows.map((r) => r.id);
  if (ids.length === 0) {
    return [];
  }

  return db.select().from(files).where(inArray(files.directoryId, ids));
}

/* ---------- file: mutations (each owns its invalidation) ---------- */

export async function createFile(
  values: Pick<NewFileRecord, "directoryId" | "name" | "r2ObjectKey" | "sizeBytes"> &
    Partial<
      Pick<
        NewFileRecord,
        | "contentType"
        | "checksumSha256"
        | "metadata"
        | "tags"
        | "sourceFileCreatedAt"
        | "sourceFileModifiedAt"
      >
    >,
): Promise<FileRecord> {
  const [row] = await db
    .insert(files)
    .values({
      directoryId: values.directoryId,
      name: values.name,
      r2ObjectKey: values.r2ObjectKey,
      sizeBytes: values.sizeBytes,
      contentType: values.contentType,
      checksumSha256: values.checksumSha256,
      metadata: values.metadata ?? null,
      tags: values.tags ?? [],
      sourceFileCreatedAt: values.sourceFileCreatedAt ?? null,
      sourceFileModifiedAt: values.sourceFileModifiedAt ?? null,
    })
    .returning();

  if (!row) {
    throw new Error("createFile: insert returned no row");
  }

  const parent = await getDirectoryByIdRaw(row.directoryId);
  if (parent) {
    invalidateAfterFileInsert(row, parent.path);
  }

  return row;
}

export async function updateFile(
  id: string,
  patch: Partial<
    Pick<
      NewFileRecord,
      | "directoryId"
      | "name"
      | "r2ObjectKey"
      | "sizeBytes"
      | "contentType"
      | "checksumSha256"
      | "metadata"
      | "tags"
      | "sourceFileCreatedAt"
      | "sourceFileModifiedAt"
    >
  >,
): Promise<FileRecord | undefined> {
  if (Object.keys(patch).length === 0) {
    return getFileByIdRaw(id);
  }

  const before = await getFileByIdRaw(id);
  if (!before) {
    return undefined;
  }

  const [after] = await db
    .update(files)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(files.id, id))
    .returning();

  if (after) {
    const parentIds =
      before.directoryId === after.directoryId
        ? [after.directoryId]
        : [before.directoryId, after.directoryId];

    const parents = await db
      .select({ path: directories.path })
      .from(directories)
      .where(inArray(directories.id, parentIds));

    invalidateAfterFileUpdate({
      before,
      after,
      parentPaths: parents.map((p) => p.path),
    });
  }

  return after;
}

export async function deleteFileById(id: string): Promise<FileRecord | undefined> {
  const [row] = await db.delete(files).where(eq(files.id, id)).returning();

  if (row) {
    const parent = await getDirectoryByIdRaw(row.directoryId);
    if (parent) {
      invalidateAfterFileDelete(row, parent.path);
    }
  }

  return row;
}

/* ---------- search ---------- */

export type SearchEntry =
  | { type: "directory"; item: Directory }
  | { type: "file"; item: FileRecord };

export type SearchArchiveResult = {
  entries: SearchEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  availableTags: string[];
};

function matchesAnyTag(itemTags: string[] | null | undefined, selectedTags: string[]): boolean {
  if (selectedTags.length === 0) {
    return true;
  }
  const entryTags = new Set((itemTags ?? []).map((t) => t.toLowerCase()));
  return selectedTags.some((tag) => entryTags.has(tag.toLowerCase()));
}

function mergeSearchEntries(childDirs: Directory[], fileRecords: FileRecord[]): SearchEntry[] {
  return [
    ...childDirs.map((item) => ({ type: "directory" as const, item })),
    ...fileRecords.map((item) => ({ type: "file" as const, item })),
  ];
}

function sortSearchEntriesByName(entries: SearchEntry[]): SearchEntry[] {
  return [...entries].sort((a, b) => {
    const nameCmp = a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" });
    if (nameCmp !== 0) {
      return nameCmp;
    }
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.item.id.localeCompare(b.item.id);
  });
}

/** Distinct tags used on any folder or file in the archive. */
export async function listArchiveTags(): Promise<string[]> {
  const [dirRows, fileRows] = await Promise.all([
    db.select({ tags: directories.tags }).from(directories),
    db.select({ tags: files.tags }).from(files),
  ]);

  return normalizeTags([
    ...dirRows.flatMap((row) => row.tags ?? []),
    ...fileRows.flatMap((row) => row.tags ?? []),
  ]).sort((a, b) => a.localeCompare(b));
}

export async function searchArchive(params: {
  q: string;
  tags: string[];
  page: number;
}): Promise<SearchArchiveResult> {
  const q = params.q.trim();
  const tagFilter = normalizeTags(params.tags);
  const page = Math.max(1, params.page);
  const pageSize = SEARCH_PAGE_SIZE;

  const hasQuery = q.length > 0;
  const hasTagFilter = tagFilter.length > 0;

  if (!hasQuery && !hasTagFilter) {
    return {
      entries: [],
      totalCount: 0,
      page,
      pageSize,
      availableTags: [],
    };
  }

  const pattern = hasQuery ? `%${escapeIlikePattern(q)}%` : null;

  const [dirRows, fileRows] = await Promise.all([
    pattern
      ? db
          .select()
          .from(directories)
          .where(or(ilike(directories.name, pattern), ilike(directories.path, pattern)))
      : db.select().from(directories),
    pattern ? db.select().from(files).where(ilike(files.name, pattern)) : db.select().from(files),
  ]);

  const mergedForTags = mergeSearchEntries(dirRows, fileRows);
  const availableTags = normalizeTags(mergedForTags.flatMap((entry) => entry.item.tags ?? [])).sort(
    (a, b) => a.localeCompare(b),
  );

  const filtered = mergedForTags.filter((entry) => matchesAnyTag(entry.item.tags, tagFilter));
  const sorted = sortSearchEntriesByName(filtered);
  const totalCount = sorted.length;
  const offset = (page - 1) * pageSize;
  const entries = sorted.slice(offset, offset + pageSize);

  return {
    entries,
    totalCount,
    page,
    pageSize,
    availableTags,
  };
}
