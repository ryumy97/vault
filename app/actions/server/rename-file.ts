"use server";

import { revalidatePath } from "next/cache";

import { getDirectoryById, getFileById, listFilesInDirectory, updateFile } from "@/db/actions";
import { getSession } from "@/lib/auth/session";
import { revalidateDirectoryListing } from "@/lib/revalidate-directory-listing";

export type RenameFileState = {
  error: string | null;
};

export async function renameFileAction(
  _prev: RenameFileState,
  formData: FormData,
): Promise<RenameFileState> {
  if (!(await getSession())) {
    return { error: "Unauthorized." };
  }

  const fileId = formData.get("fileId")?.toString().trim() ?? "";
  const name = formData.get("name")?.toString() ?? "";

  if (!fileId) {
    return { error: "Missing file." };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Enter a name." };
  }
  if (trimmed === "." || trimmed === "..") {
    return { error: "Invalid name." };
  }
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return { error: "Name cannot contain slashes." };
  }
  if (trimmed.length > 255) {
    return { error: "Name too long." };
  }

  const file = await getFileById(fileId);
  if (!file) {
    return { error: "File not found." };
  }

  const parent = await getDirectoryById(file.directoryId);
  if (!parent) {
    return { error: "Folder not found." };
  }

  if (trimmed === file.name) {
    return { error: null };
  }

  const siblings = await listFilesInDirectory(file.directoryId);
  if (siblings.some((s) => s.id !== file.id && s.name === trimmed)) {
    return { error: "A file with that name already exists in this folder." };
  }

  const updated = await updateFile(fileId, { name: trimmed });
  if (!updated) {
    return { error: "Could not update file." };
  }

  revalidateDirectoryListing(parent.path);
  revalidatePath(`/files/${fileId}`);

  return { error: null };
}
