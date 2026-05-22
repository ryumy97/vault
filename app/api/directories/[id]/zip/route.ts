import { PassThrough, Readable } from "node:stream";
import archiver from "archiver";

import { getDirectoriesByIds, getDirectoryById, listFilesInDirectorySubtree } from "@/db/actions";
import { getSession } from "@/lib/auth/session";
import { logicalFilePathForZip, relativeZipEntryPath } from "@/lib/directory-zip-paths";
import {
  appendFilesToArchive,
  asciiZipFilename,
  contentDispositionAttachment,
} from "@/lib/zip-download";

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
      await appendFilesToArchive(archive, subtreeFiles, (file) => {
        const parentPath = pathById.get(file.directoryId);
        if (!parentPath) {
          return file.name;
        }

        const logical = logicalFilePathForZip(parentPath, file.name);
        let entry = relativeZipEntryPath(dir.path, logical);
        if (!entry) {
          entry = file.name;
        }
        return entry;
      });
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
