"use client";

import { FolderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import type { Directory } from "@/db/schema";
import { hrefForDirectoryPath } from "@/lib/directory-url";

type DirectoryGridItemProps = {
  directory: Directory;
};

export function DirectoryGridItem({ directory }: DirectoryGridItemProps) {
  const router = useRouter();
  const href = hrefForDirectoryPath(directory.path);

  const open = useCallback(() => {
    router.push(href);
  }, [router, href]);

  return (
    <button
      type="button"
      className="rounded-xl border border-border bg-card text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/80 overflow-hidden"
      onDoubleClick={open}
      onClick={open}
    >
      <div className="mb-3 overflow-hidden">
        <div className="relative aspect-square w-full bg-muted/50 flex items-center justify-center">
          <FolderIcon className="size-12 text-amber-600 dark:text-amber-400" />
        </div>
      </div>

      <div className="px-4">
        <span className="block truncate font-medium text-foreground">{directory.name}</span>
      </div>
      <div className="px-4 pb-3 text-muted-foreground flex items-center">
        <p className="truncate font-mono text-xs text-muted-foreground">{directory.path}</p>
      </div>
    </button>
  );
}
