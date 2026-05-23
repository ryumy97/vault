"use client";

import { Download, FolderIcon, FolderOpen, Pencil, Tags, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { DeleteDirectoryDialog } from "@/components/directory/delete-directory-dialog";
import { EditDirectoryTagsDialog } from "@/components/directory/edit-directory-tags-dialog";
import { RenameDirectoryDialog } from "@/components/directory/rename-directory-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Directory } from "@/db/schema";
import { hrefForDirectoryPath, hrefForDirectoryZipDownload } from "@/lib/directory-url";

type DirectoryGridItemProps = {
  directory: Directory;
};

export function DirectoryGridItem({ directory }: DirectoryGridItemProps) {
  const router = useRouter();
  const href = hrefForDirectoryPath(directory.path);
  const canRename = directory.path !== "/";

  const [renameOpen, setRenameOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const open = useCallback(() => {
    router.push(href);
  }, [router, href]);

  const downloadZipHref = hrefForDirectoryZipDownload(directory.id);
  const downloadZip = useCallback(() => {
    window.open(downloadZipHref, "_blank", "noopener,noreferrer");
  }, [downloadZipHref]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
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
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        <ContextMenuItem onSelect={open}>
          <FolderOpen className="size-4" />
          Open
        </ContextMenuItem>
        {canRename ? (
          <ContextMenuItem onSelect={() => setRenameOpen(true)}>
            <Pencil className="size-4" />
            Rename
          </ContextMenuItem>
        ) : null}
        <ContextMenuItem onSelect={() => setTagsOpen(true)}>
          <Tags className="size-4" />
          Edit tags
        </ContextMenuItem>
        <ContextMenuItem onSelect={downloadZip}>
          <Download className="size-4" />
          Download
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
          <Trash2 className="size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>

      {canRename ? (
        <RenameDirectoryDialog
          directory={directory}
          showDefaultTrigger={false}
          open={renameOpen}
          onOpenChange={setRenameOpen}
        />
      ) : null}
      <EditDirectoryTagsDialog
        directory={directory}
        showDefaultTrigger={false}
        open={tagsOpen}
        onOpenChange={setTagsOpen}
      />
      <DeleteDirectoryDialog
        directory={directory}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </ContextMenu>
  );
}
