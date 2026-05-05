import "server-only";

import { eq, inArray, isNull, like, or } from "drizzle-orm";

import { parentDirectoryDbPath } from "@/lib/directory-url";

import { db } from "./index";
import {
  type Directory,
  directories,
  type FileRecord,
  files,
  type NewDirectory,
  type NewFileRecord,
} from "./schema";

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

  return row;
}

export async function getDirectoryById(id: string): Promise<Directory | undefined> {
  const [row] = await db.select().from(directories).where(eq(directories.id, id)).limit(1);

  return row;
}

export async function getDirectoriesByIds(ids: string[]): Promise<Directory[]> {
  if (ids.length === 0) {
    return [];
  }

  return db.select().from(directories).where(inArray(directories.id, ids));
}

export async function getDirectoryByPath(path: string): Promise<Directory | undefined> {
  const [row] = await db.select().from(directories).where(eq(directories.path, path)).limit(1);

  return row;
}

export async function listChildDirectories(parentId: string | null): Promise<Directory[]> {
  if (parentId === null) {
    return db.select().from(directories).where(isNull(directories.parentId));
  }

  return db.select().from(directories).where(eq(directories.parentId, parentId));
}

export async function updateDirectory(
  id: string,
  patch: Partial<Pick<NewDirectory, "name" | "parentId" | "path" | "tags">>,
): Promise<Directory | undefined> {
  if (Object.keys(patch).length === 0) {
    return getDirectoryById(id);
  }

  const [row] = await db
    .update(directories)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(directories.id, id))
    .returning();

  return row;
}

export async function deleteDirectoryById(id: string): Promise<Directory | undefined> {
  const [row] = await db.delete(directories).where(eq(directories.id, id)).returning();

  return row;
}

export type RenameDirectorySegmentResult =
  | {
      ok: true;
      newPath: string;
      revalidateOldPaths: string[];
      revalidateNewPaths: string[];
      parentPath: string | null;
    }
  | { ok: false; error: string };

/**
 * Renames a folder segment and updates `path` for the folder and all descendants.
 * Root (`path` `/`) only updates `name`.
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

  const dir = await getDirectoryById(directoryId);
  if (!dir) {
    return { ok: false, error: "Folder not found." };
  }

  if (dir.path === "/") {
    if (trimmed === dir.name) {
      return {
        ok: true,
        newPath: "/",
        revalidateOldPaths: ["/"],
        revalidateNewPaths: ["/"],
        parentPath: null,
      };
    }
    const roots = await listChildDirectories(null);
    if (roots.some((r) => r.id !== dir.id && r.name === trimmed)) {
      return {
        ok: false,
        error: "A folder with that name already exists here.",
      };
    }
    await db
      .update(directories)
      .set({ name: trimmed, updatedAt: new Date() })
      .where(eq(directories.id, directoryId));

    return {
      ok: true,
      newPath: "/",
      revalidateOldPaths: ["/"],
      revalidateNewPaths: ["/"],
      parentPath: null,
    };
  }

  const oldPath = dir.path;
  const parentPath = parentDirectoryDbPath(oldPath);
  if (parentPath === null) {
    return { ok: false, error: "Invalid folder path." };
  }

  const newPath = parentPath === "/" ? `/${trimmed}` : `${parentPath}/${trimmed}`;

  if (newPath === oldPath && trimmed === dir.name) {
    return {
      ok: true,
      newPath,
      revalidateOldPaths: [oldPath],
      revalidateNewPaths: [newPath],
      parentPath,
    };
  }

  if (!dir.parentId) {
    return { ok: false, error: "Invalid parent folder." };
  }

  const siblings = await listChildDirectories(dir.parentId);
  if (siblings.some((s) => s.id !== dir.id && s.name === trimmed)) {
    return {
      ok: false,
      error: "A folder with that name already exists here.",
    };
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

  const revalidateOldPaths = sorted.map((r) => r.path);
  const revalidateNewPaths = sorted.map((r) =>
    r.id === directoryId ? newPath : newPath + r.path.slice(oldPath.length),
  );

  for (const row of sorted) {
    const nextPath = row.id === directoryId ? newPath : newPath + row.path.slice(oldPath.length);
    const patch: {
      path: string;
      name?: string;
      updatedAt: Date;
    } = {
      path: nextPath,
      updatedAt: new Date(),
    };
    if (row.id === directoryId) {
      patch.name = trimmed;
    }
    await db.update(directories).set(patch).where(eq(directories.id, row.id));
  }

  return {
    ok: true,
    newPath,
    revalidateOldPaths,
    revalidateNewPaths,
    parentPath,
  };
}

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

  return row;
}

export async function getFileById(id: string): Promise<FileRecord | undefined> {
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);

  return row;
}

export async function getFileByR2ObjectKey(r2ObjectKey: string): Promise<FileRecord | undefined> {
  const [row] = await db.select().from(files).where(eq(files.r2ObjectKey, r2ObjectKey)).limit(1);

  return row;
}

export async function listFilesInDirectory(directoryId: string): Promise<FileRecord[]> {
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
    return getFileById(id);
  }

  const [row] = await db
    .update(files)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(files.id, id))
    .returning();

  return row;
}

export async function deleteFileById(id: string): Promise<FileRecord | undefined> {
  const [row] = await db.delete(files).where(eq(files.id, id)).returning();

  return row;
}
