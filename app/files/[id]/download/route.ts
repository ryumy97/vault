import { getBlobStream } from "@/blob";
import { getFileById } from "@/db/actions";
import { requireRequestAuth } from "@/lib/auth/request-auth";

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

/** Authenticated GET: stream file bytes from R2 for download. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireRequestAuth(request);
  if (denied) {
    return denied;
  }

  const { id } = await context.params;
  const file = await getFileById(id);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { body, contentType, contentLength } = await getBlobStream(file.r2ObjectKey);
    if (!body) {
      return new Response("Empty object", { status: 404 });
    }

    const stream = body.transformToWebStream();
    const headers = new Headers();
    headers.set("Content-Type", contentType ?? file.contentType ?? "application/octet-stream");
    if (contentLength != null) {
      headers.set("Content-Length", String(contentLength));
    }
    headers.set("Content-Disposition", contentDispositionAttachment(file.name));
    headers.set("Cache-Control", "private, no-store");

    return new Response(stream, { status: 200, headers });
  } catch (err) {
    if (s3HttpStatus(err) === 404) {
      return new Response("Object not found", { status: 404 });
    }
    console.error("files/[id]/download GET", err);
    return new Response("Failed to load object", { status: 502 });
  }
}
