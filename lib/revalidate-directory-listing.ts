import { revalidatePath } from "next/cache";

import { hrefForDirectoryPath } from "@/lib/directory-url";

/** Revalidates the `/dir/...` page for this folder, and `/` when it is root (same listing). */
export function revalidateDirectoryListing(dbPath: string): void {
  revalidatePath(hrefForDirectoryPath(dbPath));
  if (dbPath === "/") {
    revalidatePath("/");
  }
}
