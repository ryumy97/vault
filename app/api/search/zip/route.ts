import { PassThrough, Readable } from "node:stream";
import archiver from "archiver";

import { getDirectoriesByIds, listSearchFiles } from "@/db/actions";
import { getSession } from "@/lib/auth/session";
import { logicalFilePathForZip, sanitizeZipEntryPath } from "@/lib/directory-zip-paths";
import { parseSearchParams } from "@/lib/search";
import {
  appendFilesToArchive,
  asciiZipFilename,
  contentDispositionAttachment,
} from "@/lib/zip-download";

function searchZipFilename(q: string, tags: string[]): string {
  if (q.trim()) {
    return asciiZipFilename(`search-${q.trim().slice(0, 48)}`);
  }
  if (tags.length > 0) {
    return asciiZipFilename(`search-tags-${tags.slice(0, 3).join("-")}`);
  }
  return asciiZipFilename("search");
}

function zipEntryPathForSearch(parentPath: string, fileName: string): string {
  const logical = logicalFilePathForZip(parentPath, fileName);
  return sanitizeZipEntryPath(logical.replace(/^\//, ""));
}

/** Authenticated GET: stream a ZIP of all files matching search filters (all pages). */
export async function GET(request: Request) {
  if (!(await getSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  const { q, tags } = parseSearchParams(params);
  if (!q && tags.length === 0) {
    return new Response("Missing search filters", { status: 400 });
  }

  const matchingFiles = await listSearchFiles({ q, tags });
  if (matchingFiles.length === 0) {
    return new Response("No files to download", { status: 404 });
  }

  const uniqueDirIds = [...new Set(matchingFiles.map((f) => f.directoryId))];
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
      await appendFilesToArchive(archive, matchingFiles, (file) => {
        const parentPath = pathById.get(file.directoryId);
        if (!parentPath) {
          return file.name;
        }
        return zipEntryPathForSearch(parentPath, file.name);
      });
      await archive.finalize();
    } catch (e) {
      archive.abort();
      passThrough.destroy(e instanceof Error ? e : new Error(String(e)));
    }
  })();

  void background.catch((err) => {
    console.error("api/search/zip", err);
    passThrough.destroy(err instanceof Error ? err : new Error(String(err)));
  });

  const headers = new Headers();
  headers.set("Content-Type", "application/zip");
  headers.set("Content-Disposition", contentDispositionAttachment(searchZipFilename(q, tags)));
  headers.set("Cache-Control", "private, no-store");

  const webBody = Readable.toWeb(passThrough) as unknown as ReadableStream<Uint8Array>;
  return new Response(webBody, { status: 200, headers });
}
