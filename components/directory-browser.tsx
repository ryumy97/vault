import { ArrowLeft, FileIcon, Folder } from "lucide-react";
import Link from "next/link";

import { CreateDirectoryForm } from "@/components/create-directory-form";
import { DirectoryDropZone } from "@/components/directory-drop-zone";
import { formatBytes } from "@/lib/format-bytes";
import { hrefForDirectoryPath } from "@/lib/directory-url";
import type { Directory, FileRecord } from "@/db/schema";

type DirectoryBrowserProps = {
  directory: Directory;
  childDirs: Directory[];
  files: FileRecord[];
  /** When set, shows a link above the title (e.g. parent folder). */
  backHref?: string;
};

export function DirectoryBrowser({
  directory,
  childDirs,
  files,
  backHref,
}: DirectoryBrowserProps) {
  const sortedDirs = [...childDirs].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  const sortedFiles = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

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

      <header className="mb-8">
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
      </header>

      <DirectoryDropZone directoryId={directory.id}>
        <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Folders
          </h2>
          <div className="mb-4">
            <CreateDirectoryForm parentId={directory.id} />
          </div>
          {sortedDirs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No folders in this directory.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card ring-1 ring-foreground/10">
              {sortedDirs.map((dir) => (
                <li key={dir.id} className="first:rounded-t-xl last:rounded-b-xl">
                  <Link
                    href={hrefForDirectoryPath(dir.path)}
                    className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                  >
                    <Folder
                      className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
                      aria-hidden
                    />
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {dir.name}
                    </span>
                    <code className="ml-auto truncate font-mono text-xs text-muted-foreground">
                      {dir.path}
                    </code>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Files
          </h2>
          {sortedFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files in this directory.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card ring-1 ring-foreground/10">
              {sortedFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm first:rounded-t-xl last:rounded-b-xl"
                >
                  <FileIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {file.name}
                  </span>
                  <span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">
                    {formatBytes(file.sizeBytes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        </div>
      </DirectoryDropZone>
    </div>
  );
}
