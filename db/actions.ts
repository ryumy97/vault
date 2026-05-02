import "server-only";

import { eq, isNull } from "drizzle-orm";

import { db } from "./index";
import {
  directories,
  files,
  type Directory,
  type FileRecord,
  type NewDirectory,
  type NewFileRecord,
} from "./schema";

export async function createDirectory(
  values: Pick<NewDirectory, "parentId" | "name" | "path">,
): Promise<Directory> {
  const [row] = await db
    .insert(directories)
    .values({
      parentId: values.parentId,
      name: values.name,
      path: values.path,
    })
    .returning();

  if (!row) {
    throw new Error("createDirectory: insert returned no row");
  }

  return row;
}

export async function getDirectoryById(
  id: string,
): Promise<Directory | undefined> {
  const [row] = await db
    .select()
    .from(directories)
    .where(eq(directories.id, id))
    .limit(1);

  return row;
}

export async function getDirectoryByPath(
  path: string,
): Promise<Directory | undefined> {
  const [row] = await db
    .select()
    .from(directories)
    .where(eq(directories.path, path))
    .limit(1);

  return row;
}

export async function listChildDirectories(
  parentId: string | null,
): Promise<Directory[]> {
  if (parentId === null) {
    return db.select().from(directories).where(isNull(directories.parentId));
  }

  return db
    .select()
    .from(directories)
    .where(eq(directories.parentId, parentId));
}

export async function updateDirectory(
  id: string,
  patch: Partial<Pick<NewDirectory, "name" | "parentId" | "path">>,
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

export async function deleteDirectoryById(
  id: string,
): Promise<Directory | undefined> {
  const [row] = await db
    .delete(directories)
    .where(eq(directories.id, id))
    .returning();

  return row;
}

export async function createFile(
  values: Pick<
    NewFileRecord,
    "directoryId" | "name" | "r2ObjectKey" | "sizeBytes"
  > &
    Partial<Pick<NewFileRecord, "contentType" | "checksumSha256">>,
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

export async function getFileByR2ObjectKey(
  r2ObjectKey: string,
): Promise<FileRecord | undefined> {
  const [row] = await db
    .select()
    .from(files)
    .where(eq(files.r2ObjectKey, r2ObjectKey))
    .limit(1);

  return row;
}

export async function listFilesInDirectory(
  directoryId: string,
): Promise<FileRecord[]> {
  return db.select().from(files).where(eq(files.directoryId, directoryId));
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

export async function deleteFileById(
  id: string,
): Promise<FileRecord | undefined> {
  const [row] = await db.delete(files).where(eq(files.id, id)).returning();

  return row;
}
