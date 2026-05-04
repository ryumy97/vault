"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { DeleteFileDialog } from "@/components/file/delete-file-dialog";
import { FileEntryIcon } from "@/components/file/file-entry-icon";
import { RenameFileDialog } from "@/components/file/rename-file-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { directoryBreadcrumbAncestors, hrefForDirectoryPath } from "@/lib/directory-url";
import { Directory, FileRecord } from "@/db";

export function FileHeader({ file, parent }: { file: FileRecord; parent: Directory }) {
  const [renameOpen, setRenameOpen] = useState(false);

  const ancestors = directoryBreadcrumbAncestors(file.directoryId);

  return (
    <>
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

      <header className="mb-8 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
          <FileEntryIcon name={file.name} contentType={file.contentType} className="size-10" />
          <div className="flex flex-col">
            <div className="min-w-0 flex-1 flex gap-2 items-center">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                {file.name}
              </h1>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setRenameOpen(true)}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
              <RenameFileDialog
                file={file}
                showDefaultTrigger={false}
                open={renameOpen}
                onOpenChange={setRenameOpen}
              />
            </div>
            <span className="text-sm text-muted-foreground">tags:</span>
          </div>
        </div>
        <DeleteFileDialog fileId={file.id} fileName={file.name} />
      </header>
    </>
  );
}
