import Link from "next/link";

import { FileEntryIcon } from "@/components/file-entry-icon";
import { formatBytes } from "@/lib/format-bytes";
import { hrefForFileId } from "@/lib/directory-url";
import type { FileRecord } from "@/db/schema";

type FileListItemProps = {
  file: FileRecord;
};

export function FileListItem({ file }: FileListItemProps) {
  return (
    <li className="first:rounded-t-xl last:rounded-b-xl">
      <Link
        href={hrefForFileId(file.id)}
        className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
      >
        <FileEntryIcon name={file.name} contentType={file.contentType} />
        <span className="min-w-0 truncate font-medium text-foreground">
          {file.name}
        </span>
        <span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">
          {formatBytes(file.sizeBytes)}
        </span>
      </Link>
    </li>
  );
}
