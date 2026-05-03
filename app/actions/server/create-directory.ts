"use server";

import { createDirectory, getDirectoryById, listChildDirectories } from "@/db/actions";
import { revalidateDirectoryListing } from "@/lib/revalidate-directory-listing";

export type CreateDirectoryState = {
  error: string | null;
};

export async function createDirectoryAction(
  _prev: CreateDirectoryState,
  formData: FormData,
): Promise<CreateDirectoryState> {
  const parentId = formData.get("parentId")?.toString() ?? "";
  const raw = formData.get("name")?.toString() ?? "";

  if (!parentId) {
    return { error: "Missing folder context." };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { error: "Enter a folder name." };
  }
  if (trimmed === "." || trimmed === "..") {
    return { error: "Invalid folder name." };
  }
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return { error: "Name cannot contain slashes." };
  }
  if (trimmed.length > 255) {
    return { error: "Name is too long." };
  }

  const parent = await getDirectoryById(parentId);
  if (!parent) {
    return { error: "Parent folder was not found." };
  }

  const siblings = await listChildDirectories(parentId);
  if (siblings.some((d) => d.name === trimmed)) {
    return { error: "A folder with that name already exists here." };
  }

  const path = parent.path === "/" ? `/${trimmed}` : `${parent.path}/${trimmed}`;

  try {
    await createDirectory({ parentId, name: trimmed, path });
  } catch {
    return { error: "Could not create folder." };
  }

  revalidateDirectoryListing(parent.path);
  return { error: null };
}
