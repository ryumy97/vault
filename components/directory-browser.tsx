import { CreateDirectoryForm } from "@/components/create-directory-form";
import { DirectoryListItem } from "@/components/directory-list-item";
import { FileListItem } from "@/components/file-list-item";
import { FileInputButton, FolderInputButton, UploadProvider } from "@/components/upload-provider";
import type { Directory, FileRecord } from "@/db/schema";
import { DirectoryHeader } from "./directory-header";

type DirectoryBrowserProps = {
  directory: Directory;
  childDirs: Directory[];
  files: FileRecord[];
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

export function DirectoryBrowser({ directory, childDirs, files }: DirectoryBrowserProps) {
  const merged = mergeDirectoryListing(childDirs, files);
  const isEmpty = merged.length === 0;

  return (
    <UploadProvider directoryId={directory.id}>
      <div className="mx-auto w-full flex-1 px-6 py-6">
        {/* Header */}

        <DirectoryHeader directory={directory} />

        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Contents
          </h2>
          <div className="mb-4 flex gap-2">
            <CreateDirectoryForm parentId={directory.id} />
            <FileInputButton />
            <FolderInputButton />
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
      </div>
    </UploadProvider>
  );
}
