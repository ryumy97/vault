"use server";

import { redirect } from "next/navigation";

import { deleteBlob } from "@/blob";
import { deleteFileById, getDirectoryById, getFileById } from "@/db/actions";
import { getSession } from "@/lib/auth/session";
import { hrefForDirectoryPath } from "@/lib/directory-url";

export type DeleteFileState = {
  error: string | null;
};

export async function deleteFileAction(
  _prev: DeleteFileState,
  formData: FormData,
): Promise<DeleteFileState> {
  if (!(await getSession())) {
    return { error: "Unauthorized." };
  }

  const fileId = formData.get("fileId")?.toString().trim() ?? "";
  const skipRedirect = formData.get("skipRedirect") === "1";
  if (!fileId) {
    return { error: "Missing file." };
  }

  const file = await getFileById(fileId);
  if (!file) {
    return { error: "File not found." };
  }

  const parent = await getDirectoryById(file.directoryId);
  if (!parent) {
    return { error: "Folder not found." };
  }

  try {
    await deleteBlob(file.r2ObjectKey);
  } catch {
    return { error: "Could not delete file from storage." };
  }

  const removed = await deleteFileById(fileId);
  if (!removed) {
    return { error: "File record could not be removed." };
  }

  if (!skipRedirect) {
    redirect(hrefForDirectoryPath(parent.path));
  }

  return { error: null };
}
