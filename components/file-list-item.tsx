import { FileEntryIcon } from "@/components/file-entry-icon";
import { formatBytes } from "@/lib/format-bytes";
import type { FileRecord } from "@/db/schema";

type FileListItemProps = {
  file: FileRecord;
};

export function FileListItem({ file }: FileListItemProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm first:rounded-t-xl last:rounded-b-xl">
      <FileEntryIcon name={file.name} contentType={file.contentType} />
      <span className="min-w-0 truncate font-medium text-foreground">
        {file.name}
      </span>
      <span className="ml-auto shrink-0 tabular-nums text-xs text-muted-foreground">
        {formatBytes(file.sizeBytes)}
      </span>
    </li>
  );
}
