"use client";

import { Download, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { DeleteFileDialog } from "@/components/delete-file-dialog";
import { FileEntryIcon } from "@/components/file-entry-icon";
import { RenameFileDialog } from "@/components/rename-file-dialog";
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
import type { FileRecord } from "@/db/schema";
import { hrefForFileDownload, hrefForFileId } from "@/lib/directory-url";
import { formatBytes } from "@/lib/format-bytes";

type FileListItemProps = {
  file: FileRecord;
};

function FileRowMenuItems(props: {
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  downloadHref: string;
  variant: "context" | "dropdown";
}) {
  const { onOpen, onRename, onDelete, downloadHref, variant } = props;
  const Item = variant === "context" ? ContextMenuItem : DropdownMenuItem;
  const Sep = variant === "context" ? ContextMenuSeparator : DropdownMenuSeparator;

  return (
    <>
      <Item onSelect={onOpen}>
        <FileText className="size-4" />
        Open
      </Item>
      <Item onSelect={onRename}>
        <Pencil className="size-4" />
        Rename
      </Item>
      <Item onSelect={() => window.open(downloadHref, "_blank", "noopener,noreferrer")}>
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

export function FileListItem({ file }: FileListItemProps) {
  const router = useRouter();
  const href = hrefForFileId(file.id);
  const downloadHref = hrefForFileDownload(file.id);

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const open = useCallback(() => {
    router.push(href);
  }, [router, href]);

  return (
    <li
      className="first:rounded-t-xl last:rounded-b-xl cursor-auto bg-transparent px-4 py-3 text-left text-sm font-medium text-foreground transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
      onDoubleClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex items-center gap-0 w-full justify-between">
            <div className="flex items-center gap-3">
              <FileEntryIcon name={file.name} contentType={file.contentType} />
              <span className="min-w-0 truncate font-medium text-foreground">{file.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="ml-auto shrink-0 tabular-nums text-xs font-normal text-muted-foreground">
                {formatBytes(file.sizeBytes)}
              </span>
              <div className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={`Actions for ${file.name}`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    <FileRowMenuItems
                      onOpen={open}
                      onRename={() => setRenameOpen(true)}
                      onDelete={() => setDeleteOpen(true)}
                      downloadHref={downloadHref}
                      variant="dropdown"
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-44">
          <FileRowMenuItems
            onOpen={open}
            onRename={() => setRenameOpen(true)}
            onDelete={() => setDeleteOpen(true)}
            downloadHref={downloadHref}
            variant="context"
          />
        </ContextMenuContent>
      </ContextMenu>

      <RenameFileDialog
        file={file}
        showDefaultTrigger={false}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
      <DeleteFileDialog
        fileId={file.id}
        fileName={file.name}
        skipRedirect
        showDefaultTrigger={false}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </li>
  );
}
