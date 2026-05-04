"use client";

import { Download, Folder, FolderOpen, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DeleteDirectoryDialog } from "@/components/directory/delete-directory-dialog";
import { RenameDirectoryDialog } from "@/components/directory/rename-directory-dialog";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Directory } from "@/db/schema";
import { hrefForDirectoryPath, hrefForDirectoryZipDownload } from "@/lib/directory-url";
import { formatDisplayDate } from "@/lib/format-display-date";

type DirectoryListItemProps = {
  directory: Directory;
};

function DirectoryRowMenuItems(props: {
  onOpen: () => void;
  onRename: () => void;
  onDownload: () => void;
  onDelete: () => void;
  canRename: boolean;
  variant: "context" | "dropdown";
}) {
  const { onOpen, onRename, onDownload, onDelete, canRename, variant } = props;
  const Item = variant === "context" ? ContextMenuItem : DropdownMenuItem;
  const Sep = variant === "context" ? ContextMenuSeparator : DropdownMenuSeparator;

  return (
    <>
      <Item onSelect={onOpen}>
        <FolderOpen className="size-4" />
        Open
      </Item>
      {canRename ? (
        <Item onSelect={onRename}>
          <Pencil className="size-4" />
          Rename
        </Item>
      ) : null}
      <Item onSelect={onDownload}>
        <Download className="size-4" />
        Download
      </Item>
      <Sep />
      <Item variant="destructive" onSelect={onDelete}>
        <Trash2 className="size-4" />
        Delete
      </Item>
    </>
  );
}

export function DirectoryListItem({ directory: dir }: DirectoryListItemProps) {
  const router = useRouter();
  const href = hrefForDirectoryPath(dir.path);
  const canRename = dir.path !== "/";

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [windowLoaded, setWindowLoaded] = useState(false);

  const open = useCallback(() => {
    router.push(href);
  }, [router, href]);

  const downloadZipHref = hrefForDirectoryZipDownload(dir.id);
  const downloadZip = useCallback(() => {
    window.open(downloadZipHref, "_blank", "noopener,noreferrer");
  }, [downloadZipHref]);

  useEffect(() => {
    setWindowLoaded(true);
  }, []);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <tr
          className="cursor-auto border-b border-border bg-transparent text-left text-foreground transition-colors outline-none last:border-b-0 hover:bg-muted/50 focus-visible:bg-muted/50"
          onDoubleClick={open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open();
            }
          }}
          tabIndex={0}
        >
          <td className="px-4 py-3 align-middle">
            <div className="flex min-w-0 items-center gap-3">
              <Folder className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{dir.name}</div>
                <code className="mt-0.5 block truncate font-mono text-xs font-normal text-muted-foreground">
                  {dir.path}
                </code>
              </div>
            </div>
          </td>
          <td className="px-4 py-3 align-middle whitespace-nowrap text-muted-foreground tabular-nums">
            {windowLoaded && formatDisplayDate(dir.createdAt)}
          </td>
          <td className="px-4 py-3 align-middle text-muted-foreground">—</td>
          <td className="px-4 py-3 align-middle text-right text-muted-foreground">—</td>
          <td className="px-2 py-3 align-middle">
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Actions for ${dir.name}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  <DirectoryRowMenuItems
                    onOpen={open}
                    onRename={() => setRenameOpen(true)}
                    onDownload={downloadZip}
                    onDelete={() => setDeleteOpen(true)}
                    canRename={canRename}
                    variant="dropdown"
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </td>
        </tr>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        <DirectoryRowMenuItems
          onOpen={open}
          onRename={() => setRenameOpen(true)}
          onDownload={downloadZip}
          onDelete={() => setDeleteOpen(true)}
          canRename={canRename}
          variant="context"
        />
      </ContextMenuContent>

      {canRename ? (
        <RenameDirectoryDialog
          directory={dir}
          showDefaultTrigger={false}
          open={renameOpen}
          onOpenChange={setRenameOpen}
        />
      ) : null}
      <DeleteDirectoryDialog directory={dir} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </ContextMenu>
  );
}
