"use client";

import { Download, FileText, Pencil, Tags, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { DeleteFileDialog } from "@/components/file/delete-file-dialog";
import { EditFileTagsDialog } from "@/components/file/edit-file-tags-dialog";
import { FileEntryIcon } from "@/components/file/file-entry-icon";
import { RenameFileDialog } from "@/components/file/rename-file-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { FileRecord } from "@/db/schema";
import { hrefForFileDownload, hrefForFileId, hrefForFileImage } from "@/lib/directory-url";
import { formatBytes } from "@/lib/format-bytes";
import { isImageFile } from "@/lib/is-image-file";

type FileGridItemProps = {
  file: FileRecord;
};

export function FileGridItem({ file }: FileGridItemProps) {
  const router = useRouter();
  const href = hrefForFileId(file.id);
  const downloadHref = hrefForFileDownload(file.id);
  const imagePreviewSrc = hrefForFileImage(file.id);
  const showImagePreview = isImageFile(file.name, file.contentType);

  const [renameOpen, setRenameOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const open = useCallback(() => {
    router.push(href);
  }, [router, href]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          className="rounded-xl border border-border bg-card text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted/80 overflow-hidden"
          onDoubleClick={open}
          onClick={open}
        >
          {showImagePreview ? (
            <div className="mb-3 overflow-hidden">
              <div className="relative aspect-square w-full bg-muted/50">
                <Image
                  src={imagePreviewSrc}
                  alt={file.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 20vw"
                  className="object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="mb-3 overflow-hidden">
              <div className="relative aspect-square w-full bg-muted/50 flex items-center justify-center">
                <FileEntryIcon
                  className="size-12 text-amber-600 dark:text-amber-400"
                  name={file.name}
                  contentType={file.contentType}
                />
              </div>
            </div>
          )}

          <div className="px-4">
            <span className="block truncate font-medium text-foreground">{file.name}</span>
          </div>
          <div className="px-4 pb-3 text-muted-foreground flex items-center">
            <p className="truncate font-mono text-xs text-muted-foreground">
              {formatBytes(file.sizeBytes)}
            </p>
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-44">
        <ContextMenuItem onSelect={open}>
          <FileText className="size-4" />
          Open
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => setRenameOpen(true)}>
          <Pencil className="size-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => setTagsOpen(true)}>
          <Tags className="size-4" />
          Edit tags
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => window.open(downloadHref, "_blank", "noopener,noreferrer")}
        >
          <Download className="size-4" />
          Download
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
          <Trash2 className="size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>

      <RenameFileDialog
        file={file}
        showDefaultTrigger={false}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
      <EditFileTagsDialog
        file={file}
        showDefaultTrigger={false}
        open={tagsOpen}
        onOpenChange={setTagsOpen}
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
