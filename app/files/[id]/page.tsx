import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment, Suspense } from "react";
import { FileHeader } from "@/components/file/file-header";
import ImagePreview from "@/components/file/image-preview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDirectoryById, getFileById } from "@/db/actions";
import { formatBytes } from "@/lib/format-bytes";
import { isImageFile } from "@/lib/is-image-file";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const file = await getFileById(id);
  if (!file) {
    return { title: "File" };
  }
  return { title: `${file.name} · Archive` };
}

export default function FileDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={null}>
      <FileDetailContent params={params} />
    </Suspense>
  );
}

async function FileDetailContent({ params }: PageProps) {
  const { id } = await params;
  const file = await getFileById(id);

  if (!file) {
    notFound();
  }

  const parent = await getDirectoryById(file.directoryId);
  if (!parent) {
    notFound();
  }

  const showImagePreview = isImageFile(file.name, file.contentType);
  const metadataEntries = file.metadata
    ? Object.entries(file.metadata)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .toSorted(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div className="mx-auto xl:my-6 w-full flex-1 px-6 py-6 xl:max-w-6xl xl:rounded-4xl bg-background">
      <FileHeader file={file} parent={parent} />

      {showImagePreview ? (
        <Card className="mb-6 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription>Rendered from storage for image types.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ImagePreview file={file} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Metadata stored for this file. “Original file modified” uses the browser’s{" "}
            <code className="font-mono text-xs">File.lastModified</code> (usually the OS last-write
            time). “Original file created” uses EXIF capture/original time when present (common for
            photos); OS birth time is not available to web pages for arbitrary files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr] sm:gap-x-6 sm:gap-y-3">
            <dt className="text-muted-foreground">Size</dt>
            <dd className="font-medium text-foreground tabular-nums">
              {formatBytes(file.sizeBytes)}
            </dd>

            <dt className="text-muted-foreground">Type</dt>
            <dd className="break-all font-medium text-foreground">{file.contentType ?? "—"}</dd>

            <dt className="text-muted-foreground">Checksum</dt>
            <dd className="break-all font-mono text-xs text-foreground">
              {file.checksumSha256 ?? "—"}
            </dd>

            <dt className="text-muted-foreground">Storage key</dt>
            <dd className="break-all font-mono text-xs text-foreground">{file.r2ObjectKey}</dd>

            <dt className="text-muted-foreground">Added to archive</dt>
            <dd className="text-foreground">{formatDate(file.createdAt)}</dd>

            <dt className="text-muted-foreground">Record updated</dt>
            <dd className="text-foreground">{formatDate(file.updatedAt)}</dd>

            <dt className="text-muted-foreground">Original file created</dt>
            <dd className="text-foreground">
              {file.sourceFileCreatedAt ? formatDate(file.sourceFileCreatedAt) : "—"}
            </dd>

            <dt className="text-muted-foreground">Original file modified</dt>
            <dd className="text-foreground">
              {file.sourceFileModifiedAt ? formatDate(file.sourceFileModifiedAt) : "—"}
            </dd>
          </dl>
        </CardContent>
      </Card>

      {metadataEntries.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Embedded metadata</CardTitle>
            <CardDescription>
              Key–value fields saved for this file (e.g. camera / image properties).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr] sm:gap-x-6 sm:gap-y-3">
              {metadataEntries.map(([key, value]) => (
                <Fragment key={key}>
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="break-words font-medium text-foreground">
                    {formatMetadataValue(value)}
                  </dd>
                </Fragment>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
