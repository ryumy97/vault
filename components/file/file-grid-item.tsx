"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { FileEntryIcon } from "@/components/file/file-entry-icon";
import type { FileRecord } from "@/db/schema";
import { hrefForFileId, hrefForFileImage } from "@/lib/directory-url";
import { formatBytes } from "@/lib/format-bytes";
import { isImageFile } from "@/lib/is-image-file";

type FileGridItemProps = {
  file: FileRecord;
};

export function FileGridItem({ file }: FileGridItemProps) {
  const router = useRouter();
  const href = hrefForFileId(file.id);
  const imagePreviewSrc = hrefForFileImage(file.id);
  const showImagePreview = isImageFile(file.name, file.contentType);

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
  );
}
