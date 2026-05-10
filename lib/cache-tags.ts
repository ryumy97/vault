/**
 * Cache tag builders for `'use cache'` reads in `db/actions.ts`.
 *
 * Mutations call `updateTag(...)` (or `revalidateTag(...)`) with the same
 * builders so cached reads for the affected entity are invalidated.
 */

export function dirByIdTag(id: string): string {
  return `dir:by-id:${id}`;
}

export function dirByPathTag(path: string): string {
  return `dir:by-path:${path}`;
}

/** Tag for `listChildDirectories(parentId)`. `null` means the synthetic root listing. */
export function dirChildrenTag(parentId: string | null): string {
  return `dir:children:${parentId ?? "__root__"}`;
}

/** Tag for `listFilesInDirectory(directoryId)`. */
export function dirFilesTag(directoryId: string): string {
  return `dir:files:${directoryId}`;
}

export function fileByIdTag(id: string): string {
  return `file:by-id:${id}`;
}
