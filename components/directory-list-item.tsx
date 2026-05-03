"use client";

import { Folder } from "lucide-react";
import Link from "next/link";

import { RenameDirectoryDialog } from "@/components/rename-directory-dialog";
import type { Directory } from "@/db/schema";
import { hrefForDirectoryPath } from "@/lib/directory-url";

type DirectoryListItemProps = {
  directory: Directory;
};

export function DirectoryListItem({ directory: dir }: DirectoryListItemProps) {
  return (
    <li className="flex items-center gap-1 first:rounded-t-xl last:rounded-b-xl">
      <Link
        href={hrefForDirectoryPath(dir.path)}
        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
      >
        <Folder className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <span className="min-w-0 truncate font-medium text-foreground">{dir.name}</span>
        <code className="ml-auto min-w-0 truncate font-mono text-xs text-muted-foreground">
          {dir.path}
        </code>
      </Link>
      <div className="pr-2">
        <RenameDirectoryDialog directory={dir} />
      </div>
    </li>
  );
}
