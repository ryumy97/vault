/** Read every entry from a directory reader (Chrome batches `readEntries`). */
function readAllDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const acc: FileSystemEntry[] = [];
  return new Promise((resolve, reject) => {
    const read = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(acc);
            return;
          }
          acc.push(...batch);
          read();
        },
        (err) => reject(err),
      );
    };
    read();
  });
}

async function walkDirectory(
  dir: FileSystemDirectoryEntry,
  pathPrefix: string,
): Promise<Array<{ relativePath: string; file: File }>> {
  const out: Array<{ relativePath: string; file: File }> = [];
  const reader = dir.createReader();
  let entries: FileSystemEntry[];
  try {
    entries = await readAllDirectoryEntries(reader);
  } catch {
    return out;
  }

  for (const entry of entries) {
    const rel = `${pathPrefix}${entry.name}`;
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
      out.push({ relativePath: rel, file });
    } else if (entry.isDirectory) {
      const nested = await walkDirectory(entry as FileSystemDirectoryEntry, `${rel}/`);
      out.push(...nested);
    }
  }
  return out;
}

/**
 * Recursively collect files under a dropped directory. Paths look like `FolderName/a/b.txt`
 * (same shape as `File.webkitRelativePath` from a folder picker).
 */
export async function collectFilesFromDroppedDirectory(
  root: FileSystemDirectoryEntry,
): Promise<Array<{ relativePath: string; file: File }>> {
  return walkDirectory(root, `${root.name}/`);
}

export function getDataTransferEntry(item: DataTransferItem): FileSystemEntry | null {
  const wk = item as DataTransferItem & {
    webkitGetAsEntry?: () => FileSystemEntry | null;
  };
  return wk.webkitGetAsEntry?.() ?? null;
}
