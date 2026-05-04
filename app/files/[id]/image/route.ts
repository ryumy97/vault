import { getBlobStream } from "@/blob";
import { getFileById } from "@/db/actions";
import { isImageFile } from "@/lib/is-image-file";

function s3HttpStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "$metadata" in err) {
    return (err as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
  }
  return undefined;
}

/** Authenticated GET: stream image bytes from R2 for `/files/{id}` preview. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const file = await getFileById(id);
  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  if (!isImageFile(file.name, file.contentType)) {
    return new Response("Not an image", { status: 415 });
  }

  try {
    const { body, contentType, contentLength } = await getBlobStream(
      file.r2ObjectKey,
    );
    if (!body) {
      return new Response("Empty object", { status: 404 });
    }

    const stream = body.transformToWebStream();
    const headers = new Headers();
    headers.set(
      "Content-Type",
      contentType ?? file.contentType ?? "application/octet-stream",
    );
    if (contentLength != null) {
      headers.set("Content-Length", String(contentLength));
    }
    headers.set("Cache-Control", "private, max-age=3600");

    return new Response(stream, { status: 200, headers });
  } catch (err) {
    if (s3HttpStatus(err) === 404) {
      return new Response("Object not found", { status: 404 });
    }
    console.error("files/[id]/image GET", err);
    return new Response("Failed to load object", { status: 502 });
  }
}
