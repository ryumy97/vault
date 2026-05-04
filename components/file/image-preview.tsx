"use client";

import Image from "next/image";

import type { FileRecord } from "@/db/schema";
import { hrefForFileImage } from "@/lib/directory-url";
import { parseDimensionsFromMetadata } from "@/lib/parse-dimensions-from-metadata";

type ImagePreviewProps = {
  file: Pick<FileRecord, "id" | "name" | "metadata">;
};

/**
 * Next.js `Image` needs intrinsic dimensions or `fill` + positioned parent.
 * When upload saved `Dimensions` in metadata, we use width/height; otherwise `fill` + min-height box.
 * `unoptimized` keeps the request in the browser so the session cookie reaches `/files/.../image`.
 */
export default function ImagePreview({ file }: ImagePreviewProps) {
  const src = hrefForFileImage(file.id);
  const dims = parseDimensionsFromMetadata(file.metadata);

  if (dims) {
    return (
      <div className="flex w-full justify-center">
        <Image
          src={src}
          alt={file.name}
          width={dims.width}
          height={dims.height}
          className="w-full max-w-full rounded-md border border-border object-contain bg-muted/40"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-md border border-border bg-muted/40">
      <img
        src={src}
        alt={file.name}
        className="w-full max-w-full rounded-md border border-border object-contain bg-muted/40"
      />
    </div>
  );
}
