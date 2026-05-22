import { Readable } from "node:stream";
import type archiver from "archiver";

import { getBlobStream } from "@/blob";
import type { FileRecord } from "@/db/schema";

export function s3HttpStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "$metadata" in err) {
    return (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  }
  return undefined;
}

export function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii.replace(/"/g, '\\"')}"; filename*=UTF-8''${encoded}`;
}

export function asciiZipFilename(baseName: string): string {
  const base = baseName.trim() || "download";
  return `${base.replace(/[^\x20-\x7E]/g, "_")}.zip`;
}

export async function appendFilesToArchive(
  archive: archiver.Archiver,
  files: FileRecord[],
  resolveEntryPath: (file: FileRecord) => string,
): Promise<void> {
  const usedNames = new Set<string>();

  for (const file of files) {
    let entry = resolveEntryPath(file);
    if (!entry) {
      entry = file.name;
    }
    if (usedNames.has(entry)) {
      const dot = entry.lastIndexOf(".");
      const stem = dot > 0 ? entry.slice(0, dot) : entry;
      const ext = dot > 0 ? entry.slice(dot) : "";
      entry = `${stem}-${file.id.slice(0, 8)}${ext}`;
    }
    usedNames.add(entry);

    try {
      const { body } = await getBlobStream(file.r2ObjectKey);
      if (!body) {
        archive.append(Buffer.alloc(0), { name: entry });
        continue;
      }
      const webStream = body.transformToWebStream();
      const readable = Readable.fromWeb(
        webStream as import("node:stream/web").ReadableStream<Uint8Array>,
      );
      archive.append(readable, { name: entry });
    } catch (err) {
      if (s3HttpStatus(err) === 404) {
        archive.append(Buffer.alloc(0), { name: entry });
        continue;
      }
      throw err;
    }
  }
}
