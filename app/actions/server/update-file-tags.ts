"use server";

import { getDirectoryById, getFileById, updateFile } from "@/db/actions";
import { getSession } from "@/lib/auth/session";
import { parseTagsInput } from "@/lib/tags";

export type UpdateFileTagsState = {
  error: string | null;
};

export async function updateFileTagsAction(
  _prev: UpdateFileTagsState,
  formData: FormData,
): Promise<UpdateFileTagsState> {
  if (!(await getSession())) {
    return { error: "Unauthorized." };
  }

  const fileId = formData.get("fileId")?.toString().trim() ?? "";
  const tags = parseTagsInput(formData.get("tags")?.toString() ?? "");
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

  const updated = await updateFile(fileId, { tags });
  if (!updated) {
    return { error: "Could not update tags." };
  }

  return { error: null };
}
