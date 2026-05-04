import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CreateDirectoryForm } from "@/components/create-directory-form";
import { DirectoryBrowserActions } from "@/components/directory-browser-actions";
import { DirectoryDropZone } from "@/components/directory-drop-zone";
import { DirectoryListItem } from "@/components/directory-list-item";
import { FileListItem } from "@/components/file-list-item";
import type { Directory, FileRecord } from "@/db/schema";

type DirectoryBrowserProps = {
  directory: Directory;
  childDirs: Directory[];
  files: FileRecord[];
  /** When set, shows a link above the title (e.g. parent folder). */
  backHref?: string;
};

type MergedEntry = { type: "directory"; item: Directory } | { type: "file"; item: FileRecord };

function mergeDirectoryListing(childDirs: Directory[], fileRecords: FileRecord[]): MergedEntry[] {
  return [
    ...childDirs.map((item) => ({ type: "directory" as const, item })),
    ...fileRecords.map((item) => ({ type: "file" as const, item })),
  ].sort((a, b) => {
    const cmp = a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" });
    if (cmp !== 0) {
      return cmp;
    }
    if (a.type === b.type) {
      return 0;
    }
    return a.type === "directory" ? -1 : 1;
  });
}

export function DirectoryBrowser({ directory, childDirs, files, backHref }: DirectoryBrowserProps) {
  const merged = mergeDirectoryListing(childDirs, files);
  const isEmpty = merged.length === 0;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          Back
        </Link>
      ) : null}

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Archive
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{directory.name}</span>
            <span className="mx-1.5 text-muted-foreground/60">·</span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {directory.path}
            </code>
          </p>
        </div>
        <DirectoryBrowserActions directory={directory} />
      </header>

      <DirectoryDropZone directoryId={directory.id}>
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Contents
          </h2>
          <div className="mb-4">
            <CreateDirectoryForm parentId={directory.id} />
          </div>
          {isEmpty ? (
            <p className="text-sm text-muted-foreground">No folders or files in this directory.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card ring-1 ring-foreground/10">
              {merged.map((entry) =>
                entry.type === "directory" ? (
                  <DirectoryListItem key={entry.item.id} directory={entry.item} />
                ) : (
                  <FileListItem key={entry.item.id} file={entry.item} />
                ),
              )}
            </ul>
          )}
        </section>
      </DirectoryDropZone>
    </div>
  );
}
