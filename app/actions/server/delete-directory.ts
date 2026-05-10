"use server";

import { deleteBlob } from "@/blob";
import { deleteDirectoryById, getDirectoryById, listFilesInDirectorySubtree } from "@/db/actions";
import { getSession } from "@/lib/auth/session";

export type DeleteDirectoryState = {
  error: string | null;
};

export async function deleteDirectoryAction(
  _prev: DeleteDirectoryState,
  formData: FormData,
): Promise<DeleteDirectoryState> {
  if (!(await getSession())) {
    return { error: "Unauthorized." };
  }

  const directoryId = formData.get("directoryId")?.toString().trim() ?? "";
  if (!directoryId) {
    return { error: "Missing folder." };
  }

  const dir = await getDirectoryById(directoryId);
  if (!dir) {
    return { error: "Folder not found." };
  }

  if (dir.path === "/") {
    return { error: "The archive root cannot be deleted." };
  }

  const parent = dir.parentId ? await getDirectoryById(dir.parentId) : null;
  if (!parent) {
    return { error: "Parent folder not found." };
  }

  const subtreeFiles = await listFilesInDirectorySubtree(dir);
  for (const f of subtreeFiles) {
    try {
      await deleteBlob(f.r2ObjectKey);
    } catch {
      return { error: "Could not delete one or more files from storage." };
    }
  }

  const removed = await deleteDirectoryById(directoryId);
  if (!removed) {
    return { error: "Folder could not be removed." };
  }

  return { error: null };
}
