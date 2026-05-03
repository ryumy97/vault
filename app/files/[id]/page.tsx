import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FileEntryIcon } from "@/components/file-entry-icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDirectoryById, getFileById } from "@/db/actions";
import { hrefForDirectoryPath, hrefForFileImage } from "@/lib/directory-url";
import { formatBytes } from "@/lib/format-bytes";
import { isImageFile } from "@/lib/is-image-file";

type PageProps = {
  params: Promise<{ id: string }>;
};

function logicalFilePath(parentPath: string, fileName: string): string {
  if (parentPath === "/") {
    return `/${fileName}`;
  }
  return `${parentPath}/${fileName}`;
}

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const file = await getFileById(id);
  if (!file) {
    return { title: "File" };
  }
  return { title: `${file.name} · Archive` };
}

export default async function FileDetailPage({ params }: PageProps) {
  const { id } = await params;
  const file = await getFileById(id);

  if (!file) {
    notFound();
  }

  const parent = await getDirectoryById(file.directoryId);
  if (!parent) {
    notFound();
  }

  const pathLabel = logicalFilePath(parent.path, file.name);
  const backHref = hrefForDirectoryPath(parent.path);
  const showImagePreview = isImageFile(file.name, file.contentType);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden />
        Back to {parent.name}
      </Link>

      <header className="mb-8 flex flex-wrap items-start gap-4">
        <FileEntryIcon
          name={file.name}
          contentType={file.contentType}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {file.name}
          </h1>
          <p className="mt-1 break-all font-mono text-sm text-muted-foreground">
            {pathLabel}
          </p>
        </div>
      </header>

      {showImagePreview ? (
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>Rendered from storage for image types.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- session cookie; avoid Image optimizer fetch without auth */}
            <img
              src={hrefForFileImage(file.id)}
              alt={file.name}
              className="max-h-[min(70vh,48rem)] w-full rounded-md border border-border object-contain bg-muted/40"
              loading="lazy"
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Metadata stored for this file.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr] sm:gap-x-6 sm:gap-y-3">
            <dt className="text-muted-foreground">Size</dt>
            <dd className="font-medium text-foreground tabular-nums">
              {formatBytes(file.sizeBytes)}
            </dd>

            <dt className="text-muted-foreground">Type</dt>
            <dd className="break-all font-medium text-foreground">
              {file.contentType ?? "—"}
            </dd>

            <dt className="text-muted-foreground">Checksum</dt>
            <dd className="break-all font-mono text-xs text-foreground">
              {file.checksumSha256 ?? "—"}
            </dd>

            <dt className="text-muted-foreground">Storage key</dt>
            <dd className="break-all font-mono text-xs text-foreground">
              {file.r2ObjectKey}
            </dd>

            <dt className="text-muted-foreground">Created</dt>
            <dd className="text-foreground">{formatDate(file.createdAt)}</dd>

            <dt className="text-muted-foreground">Updated</dt>
            <dd className="text-foreground">{formatDate(file.updatedAt)}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
