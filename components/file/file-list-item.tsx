"use client";

import { Download, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { DeleteFileDialog } from "@/components/file/delete-file-dialog";
import { FileEntryIcon } from "@/components/file/file-entry-icon";
import { RenameFileDialog } from "@/components/file/rename-file-dialog";
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
import { formatDisplayDate } from "@/lib/format-display-date";
import { tagToneClass } from "@/lib/tags";
import { cn } from "@/lib/utils";

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
  const [windowLoaded, setWindowLoaded] = useState(false);

  const open = useCallback(() => {
    router.push(href);
  }, [router, href]);

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
              <FileEntryIcon name={file.name} contentType={file.contentType} />
              <div className="min-w-0">
                <span className="block min-w-0 truncate font-medium text-foreground">
                  {file.name}
                </span>
                {file.tags.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {file.tags.map((tag) => (
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
          </td>
          <td className="px-4 py-3 align-middle whitespace-nowrap text-muted-foreground tabular-nums">
            {windowLoaded && formatDisplayDate(file.createdAt)}
          </td>
          <td className="px-4 py-3 align-middle whitespace-nowrap text-muted-foreground tabular-nums">
            {windowLoaded && file.sourceFileCreatedAt
              ? formatDisplayDate(file.sourceFileCreatedAt)
              : "—"}
          </td>
          <td className="px-4 py-3 align-middle text-right font-medium text-foreground tabular-nums whitespace-nowrap">
            {formatBytes(file.sizeBytes)}
          </td>
          <td className="px-2 py-3 align-middle">
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
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
          </td>
        </tr>
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
    </ContextMenu>
  );
}
