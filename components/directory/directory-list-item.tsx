"use client";

import { Download, Folder, FolderOpen, MoreHorizontal, Pencil, Tags, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DeleteDirectoryDialog } from "@/components/directory/delete-directory-dialog";
import { EditDirectoryTagsDialog } from "@/components/directory/edit-directory-tags-dialog";
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
import { tagToneClass } from "@/lib/tags";
import { cn } from "@/lib/utils";

type DirectoryListItemProps = {
  directory: Directory;
};

function DirectoryRowMenuItems(props: {
  onOpen: () => void;
  onRename: () => void;
  onEditTags: () => void;
  onDownload: () => void;
  onDelete: () => void;
  canRename: boolean;
  variant: "context" | "dropdown";
}) {
  const { onOpen, onRename, onEditTags, onDownload, onDelete, canRename, variant } = props;
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
      <Item onSelect={onEditTags}>
        <Tags className="size-4" />
        Edit tags
      </Item>
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
  const [tagsOpen, setTagsOpen] = useState(false);
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
        {/* biome-ignore lint/a11y/noStaticElementInteractions: row supports double-click to open */}
        <div
          className="cursor-auto border-b border-border bg-transparent text-left text-foreground transition-colors outline-none last:border-b-0 hover:bg-muted/50 focus-visible:bg-muted/50 grid grid-cols-subgrid col-span-full"
          onDoubleClick={open}
        >
          <div className="px-4 py-3 whitespace-nowrap text-muted-foreground flex items-center">
            —
          </div>
          <div className="px-4 py-3 flex items-center">
            <div className="flex min-w-0 items-center gap-3">
              <Folder className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{dir.name}</div>
                <code className="mt-0.5 block truncate font-mono text-xs font-normal text-muted-foreground">
                  {dir.path}
                </code>
                {dir.tags.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {dir.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium",
                          tagToneClass(tag),
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums flex items-center">
            {windowLoaded && formatDisplayDate(dir.createdAt)}
          </div>
          <div className="px-4 py-3 text-muted-foreground flex items-center">—</div>
          <div className="px-4 py-3 text-right text-muted-foreground flex items-center justify-end">
            —
          </div>
          <div className="px-2 py-3 flex items-center">
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
                    onEditTags={() => setTagsOpen(true)}
                    onDownload={downloadZip}
                    onDelete={() => setDeleteOpen(true)}
                    canRename={canRename}
                    variant="dropdown"
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        <DirectoryRowMenuItems
          onOpen={open}
          onRename={() => setRenameOpen(true)}
          onEditTags={() => setTagsOpen(true)}
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
      <EditDirectoryTagsDialog
        directory={dir}
        showDefaultTrigger={false}
        open={tagsOpen}
        onOpenChange={setTagsOpen}
      />
      <DeleteDirectoryDialog directory={dir} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </ContextMenu>
  );
}
