"use server";

import { redirect } from "next/navigation";

import { getDirectoryById, renameDirectorySegment, updateDirectory } from "@/db/actions";
import { getSession } from "@/lib/auth/session";
import { hrefForDirectoryPath } from "@/lib/directory-url";
import { revalidateDirectoryListing } from "@/lib/revalidate-directory-listing";
import { parseTagsInput } from "@/lib/tags";

export type RenameDirectoryState = {
  error: string | null;
};

export async function renameDirectoryAction(
  _prev: RenameDirectoryState,
  formData: FormData,
): Promise<RenameDirectoryState> {
  if (!(await getSession())) {
    return { error: "Unauthorized." };
  }

  const directoryId = formData.get("directoryId")?.toString() ?? "";
  const name = formData.get("name")?.toString() ?? "";
  const tags = parseTagsInput(formData.get("tags")?.toString() ?? "");
  const redirectAfter = formData.get("redirectAfter") === "1";

  if (!directoryId) {
    return { error: "Missing folder." };
  }

  const target = await getDirectoryById(directoryId);
  if (!target) {
    return { error: "Folder not found." };
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

  if (target.path === "/") {
    if (trimmed !== target.name) {
      return { error: "The archive root cannot be renamed." };
    }
    const updated = await updateDirectory(directoryId, { tags });
    if (!updated) {
      return { error: "Could not update folder." };
    }
    revalidateDirectoryListing("/");
    return { error: null };
  }

  let redirectedPath: string | null = null;
  if (trimmed !== target.name) {
    const result = await renameDirectorySegment(directoryId, trimmed);
    if (!result.ok) {
      return { error: result.error };
    }

    for (const p of result.revalidateOldPaths) {
      revalidateDirectoryListing(p);
    }
    for (const p of result.revalidateNewPaths) {
      revalidateDirectoryListing(p);
    }
    if (result.parentPath !== null) {
      revalidateDirectoryListing(result.parentPath);
    }

    redirectedPath = result.newPath;
  }

  const updated = await updateDirectory(directoryId, { tags });
  if (!updated) {
    return { error: "Could not update folder." };
  }
  revalidateDirectoryListing(target.path);
  if (redirectedPath) {
    revalidateDirectoryListing(redirectedPath);
    if (redirectAfter) {
      redirect(hrefForDirectoryPath(redirectedPath));
    }
  }

  return { error: null };
}
