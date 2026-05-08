import { CreateDirectoryForm } from "@/components/directory/create-directory-form";
import { DirectoryContentsTable } from "@/components/directory/directory-contents-table";
import { FileInputButton, FolderInputButton, UploadProvider } from "@/components/upload-provider";
import type { Directory, FileRecord } from "@/db/schema";
import type { DirectoryViewMode } from "@/lib/view-mode";
import { DirectoryHeader } from "./directory-header";

type DirectoryBrowserProps = {
  directory: Directory;
  childDirs: Directory[];
  files: FileRecord[];
  viewMode: DirectoryViewMode;
};

export function DirectoryBrowser({ directory, childDirs, files, viewMode }: DirectoryBrowserProps) {
  const isEmpty = childDirs.length === 0 && files.length === 0;

  return (
    <UploadProvider directoryId={directory.id}>
      <div className="mx-auto xl:my-6 w-full flex-1 px-6 py-6 xl:max-w-6xl xl:rounded-4xl bg-background">
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
            <DirectoryContentsTable childDirs={childDirs} files={files} viewMode={viewMode} />
          )}
        </section>
      </div>
    </UploadProvider>
  );
}
