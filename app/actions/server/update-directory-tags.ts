"use server";

import { getDirectoryById, updateDirectory } from "@/db/actions";
import { getSession } from "@/lib/auth/session";
import { parseTagsInput } from "@/lib/tags";

export type UpdateDirectoryTagsState = {
  error: string | null;
};

export async function updateDirectoryTagsAction(
  _prev: UpdateDirectoryTagsState,
  formData: FormData,
): Promise<UpdateDirectoryTagsState> {
  if (!(await getSession())) {
    return { error: "Unauthorized." };
  }

  const directoryId = formData.get("directoryId")?.toString().trim() ?? "";
  const tags = parseTagsInput(formData.get("tags")?.toString() ?? "");
  if (!directoryId) {
    return { error: "Missing folder." };
  }

  const directory = await getDirectoryById(directoryId);
  if (!directory) {
    return { error: "Folder not found." };
  }

  const updated = await updateDirectory(directoryId, { tags });
  if (!updated) {
    return { error: "Could not update tags." };
  }

  return { error: null };
}
