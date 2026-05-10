import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import type { Directory, FileRecord } from "@/db/schema";
import {
  dirByIdTag,
  dirByPathTag,
  dirChildrenTag,
  dirFilesTag,
  fileByIdTag,
} from "@/lib/cache-tags";
import { hrefForDirectoryPath, hrefForFileId, parentDirectoryDbPath } from "@/lib/directory-url";

/**
 * Cache invalidation for `'use cache'` reads in `db/actions.ts`.
 *
 * Uses `updateTag` (Server Action only, immediate read-your-own-writes). The
 * v16 docs explicitly recommend this over `updateTag(tag, { expire: 0 })`
 * for post-mutation invalidation. If a future Route Handler needs to invoke
 * these helpers, swap `updateTag` for `updateTag(tag, { expire: 0 })`.
 */

function revalidateDirectoryRoute(path: string): void {
  revalidatePath(hrefForDirectoryPath(path));
  if (path === "/") {
    revalidatePath("/");
  }
}

/** Folder was inserted. Invalidates the parent's children listing and route. */
export function invalidateAfterDirectoryInsert(dir: Directory): void {
  updateTag(dirChildrenTag(dir.parentId ?? null));
  updateTag(dirByPathTag(dir.path));

  const parentPath = parentDirectoryDbPath(dir.path);
  if (parentPath !== null) {
    revalidateDirectoryRoute(parentPath);
  }
}

/**
 * Folder metadata changed (rename, move, and/or tags edit).
 *
 * Always invalidates the folder's own children listing because each child row
 * embeds the folder's path; renaming this folder rewrites those embedded paths.
 */
export function invalidateAfterDirectoryUpdate(args: {
  before: Directory;
  after: Directory;
}): void {
  const { before, after } = args;

  updateTag(dirByIdTag(after.id));
  updateTag(dirByPathTag(before.path));
  updateTag(dirChildrenTag(after.parentId ?? null));
  updateTag(dirChildrenTag(after.id));
  revalidateDirectoryRoute(before.path);

  if (after.path !== before.path) {
    updateTag(dirByPathTag(after.path));
    revalidateDirectoryRoute(after.path);
  }

  if ((before.parentId ?? null) !== (after.parentId ?? null)) {
    updateTag(dirChildrenTag(before.parentId ?? null));
  }
}

/** Folder was deleted. */
export function invalidateAfterDirectoryDelete(dir: Directory): void {
  updateTag(dirByIdTag(dir.id));
  updateTag(dirByPathTag(dir.path));
  updateTag(dirChildrenTag(dir.parentId ?? null));
  updateTag(dirChildrenTag(dir.id));
  updateTag(dirFilesTag(dir.id));
  revalidateDirectoryRoute(dir.path);

  const parentPath = parentDirectoryDbPath(dir.path);
  if (parentPath !== null) {
    revalidateDirectoryRoute(parentPath);
  }
}

/**
 * One or more folders had their `path` (and possibly `name`) rewritten by a
 * subtree rename. Each entry should carry pre-update parent + path info plus
 * the post-update path so we can invalidate both sides.
 */
export type DirectoryRenameAffected = {
  id: string;
  parentId: string | null;
  oldPath: string;
  newPath: string;
};

export function invalidateAfterDirectoryRename(
  affected: ReadonlyArray<DirectoryRenameAffected>,
): void {
  for (const a of affected) {
    updateTag(dirByIdTag(a.id));
    updateTag(dirByPathTag(a.oldPath));
    updateTag(dirChildrenTag(a.parentId));
    updateTag(dirChildrenTag(a.id));
    revalidateDirectoryRoute(a.oldPath);

    if (a.newPath !== a.oldPath) {
      updateTag(dirByPathTag(a.newPath));
      revalidateDirectoryRoute(a.newPath);
    }
  }
}

/** File was inserted. Caller passes the parent's path for route invalidation. */
export function invalidateAfterFileInsert(file: FileRecord, parentPath: string): void {
  updateTag(dirFilesTag(file.directoryId));
  revalidateDirectoryRoute(parentPath);
}

/**
 * File metadata changed (rename, tags edit, or move).
 *
 * `parentPaths` should include both the previous and current parent's path
 * when `directoryId` changed; otherwise just the current one.
 */
export function invalidateAfterFileUpdate(args: {
  before: FileRecord;
  after: FileRecord;
  parentPaths: ReadonlyArray<string>;
}): void {
  updateTag(fileByIdTag(args.after.id));
  updateTag(dirFilesTag(args.after.directoryId));
  if (args.before.directoryId !== args.after.directoryId) {
    updateTag(dirFilesTag(args.before.directoryId));
  }
  for (const p of args.parentPaths) {
    revalidateDirectoryRoute(p);
  }
  revalidatePath(hrefForFileId(args.after.id));
}

/** File was deleted. Caller passes the parent's path for route invalidation. */
export function invalidateAfterFileDelete(file: FileRecord, parentPath: string): void {
  updateTag(fileByIdTag(file.id));
  updateTag(dirFilesTag(file.directoryId));
  revalidateDirectoryRoute(parentPath);
  revalidatePath(hrefForFileId(file.id));
}
