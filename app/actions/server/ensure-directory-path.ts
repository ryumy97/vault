"use server";

import { createDirectory, getDirectoryById, listChildDirectories } from "@/db/actions";
import type { Directory } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { revalidateDirectoryListing } from "@/lib/revalidate-directory-listing";

const MAX_SEGMENTS = 128;

function validSegment(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") {
    return false;
  }
  if (trimmed.includes("/") || trimmed.includes("\\")) {
    return false;
  }
  if (trimmed.length > 255) {
    return false;
  }
  return true;
}

export type EnsureDirectoryPathResult =
  | { ok: true; directoryId: string }
  | { ok: false; error: string };

/**
 * From an existing folder (`rootDirectoryId`), creates any missing child folders along
 * `relativeDirPath` (posix, no leading slash, e.g. `Photos/2024`) and returns the leaf folder id.
 * Empty string means the root itself.
 */
export async function ensureDirectoryPathFromRoot(
  rootDirectoryId: string,
  relativeDirPath: string,
): Promise<EnsureDirectoryPathResult> {
  if (!(await getSession())) {
    return { ok: false, error: "Unauthorized." };
  }

  const norm = relativeDirPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const segments = norm.length > 0 ? norm.split("/").filter(Boolean) : [];

  if (segments.length > MAX_SEGMENTS) {
    return { ok: false, error: "Folder path is too deep." };
  }

  for (const s of segments) {
    if (!validSegment(s)) {
      return { ok: false, error: "Invalid folder name in path." };
    }
  }

  const root = await getDirectoryById(rootDirectoryId);
  if (!root) {
    return { ok: false, error: "Folder not found." };
  }

  let currentId = rootDirectoryId;
  let currentDir: Directory | undefined = root;

  for (const name of segments) {
    const siblings = await listChildDirectories(currentId);
    let child = siblings.find((d) => d.name === name);

    if (!child) {
      const parent = currentDir ?? (await getDirectoryById(currentId));
      if (!parent) {
        return { ok: false, error: "Parent folder was not found." };
      }
      const path = parent.path === "/" ? `/${name}` : `${parent.path}/${name}`;
      try {
        child = await createDirectory({ parentId: currentId, name, path });
      } catch {
        const again = await listChildDirectories(currentId);
        child = again.find((d) => d.name === name);
        if (!child) {
          return { ok: false, error: "Could not create folder." };
        }
      }
    }

    currentId = child.id;
    currentDir = child;
  }

  revalidateDirectoryListing(root.path);
  return { ok: true, directoryId: currentId };
}
