"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { DeleteDirectoryDialog } from "@/components/delete-directory-dialog";
import { RenameDirectoryDialog } from "@/components/rename-directory-dialog";
import { Button } from "@/components/ui/button";
import type { Directory } from "@/db/schema";
import { hrefForDirectoryPath, parentDirectoryDbPath } from "@/lib/directory-url";

type DirectoryBrowserActionsProps = {
  directory: Pick<Directory, "id" | "name" | "path">;
};

export function DirectoryBrowserActions({ directory }: DirectoryBrowserActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (directory.path === "/") {
    return null;
  }

  const parentPath = parentDirectoryDbPath(directory.path);
  const redirectAfterDelete = parentPath !== null ? hrefForDirectoryPath(parentPath) : "/dir";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RenameDirectoryDialog directory={directory} redirectAfter />
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="gap-1.5"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" aria-hidden />
        Delete folder
      </Button>
      <DeleteDirectoryDialog
        directory={directory}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectHref={redirectAfterDelete}
      />
    </div>
  );
}
