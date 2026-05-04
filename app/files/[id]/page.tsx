import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { DeleteFileDialog } from "@/components/delete-file-dialog";
import { FileEntryIcon } from "@/components/file-entry-icon";
import ImagePreview from "@/components/image-preview";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDirectoryById, getFileById } from "@/db/actions";
import { directoryBreadcrumbAncestors, hrefForDirectoryPath } from "@/lib/directory-url";
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
  const ancestors = directoryBreadcrumbAncestors(parent.path);
  const showImagePreview = isImageFile(file.name, file.contentType);
  const metadataEntries = file.metadata
    ? Object.entries(file.metadata)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .toSorted(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={hrefForDirectoryPath("/")}>Archive</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {ancestors.map((a) => (
            <Fragment key={a.dbPath}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={hrefForDirectoryPath(a.dbPath)}>{a.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Fragment>
          ))}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={hrefForDirectoryPath(parent.path)}>{parent.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{file.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="mb-8 flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
          <FileEntryIcon name={file.name} contentType={file.contentType} className="size-10" />
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              {file.name}
            </h1>
            <p className="mt-1 break-all font-mono text-sm text-muted-foreground">{pathLabel}</p>
          </div>
        </div>
        <DeleteFileDialog fileId={file.id} fileName={file.name} />
      </header>

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
