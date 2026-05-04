import { PassThrough, Readable } from "node:stream";
import archiver from "archiver";

import { getBlobStream } from "@/blob";
import { getDirectoriesByIds, getDirectoryById, listFilesInDirectorySubtree } from "@/db/actions";
import { getSession } from "@/lib/auth/session";
import { logicalFilePathForZip, relativeZipEntryPath } from "@/lib/directory-zip-paths";

export const runtime = "nodejs";

function s3HttpStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "$metadata" in err) {
    return (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  }
  return undefined;
}

function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii.replace(/"/g, '\\"')}"; filename*=UTF-8''${encoded}`;
}

function asciiZipFilename(folderName: string): string {
  const base = folderName.trim() || "folder";
  return `${base.replace(/[^\x20-\x7E]/g, "_")}.zip`;
}

/** Authenticated GET: stream a ZIP of this folder and all descendants. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;
  const dir = await getDirectoryById(id);
  if (!dir) {
    return new Response("Not found", { status: 404 });
  }

  const subtreeFiles = await listFilesInDirectorySubtree(dir);
  const uniqueDirIds = [...new Set(subtreeFiles.map((f) => f.directoryId))];
  const dirRows = await getDirectoriesByIds(uniqueDirIds);
  const pathById = new Map(dirRows.map((d) => [d.id, d.path]));

  const archive = archiver("zip", { zlib: { level: 5 } });
  const passThrough = new PassThrough();

  archive.on("error", (err) => {
    passThrough.destroy(err);
  });

  archive.pipe(passThrough);

  const background = (async () => {
    try {
      const usedNames = new Set<string>();
      for (const file of subtreeFiles) {
        const parentPath = pathById.get(file.directoryId);
        if (!parentPath) {
          continue;
        }

        const logical = logicalFilePathForZip(parentPath, file.name);
        let entry = relativeZipEntryPath(dir.path, logical);
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
      await archive.finalize();
    } catch (e) {
      archive.abort();
      passThrough.destroy(e instanceof Error ? e : new Error(String(e)));
    }
  })();

  void background.catch((err) => {
    console.error("api/directories/[id]/zip", err);
    passThrough.destroy(err instanceof Error ? err : new Error(String(err)));
  });

  const headers = new Headers();
  headers.set("Content-Type", "application/zip");
  headers.set("Content-Disposition", contentDispositionAttachment(asciiZipFilename(dir.name)));
  headers.set("Cache-Control", "private, no-store");

  const webBody = Readable.toWeb(passThrough) as unknown as ReadableStream<Uint8Array>;
  return new Response(webBody, { status: 200, headers });
}
