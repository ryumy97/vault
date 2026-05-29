import { listSearchFiles } from "@/db/actions";
import { getSession } from "@/lib/auth/session";
import {
  filesToTagImageSearchResults,
  parseTagSearchParam,
} from "@/lib/search-tag-images";

/** Authenticated GET: images with a given tag (`?tag=`). */
export async function GET(request: Request) {
  if (!(await getSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  const tag = parseTagSearchParam(params);
  if (!tag) {
    return Response.json({ error: "Missing tag query parameter" }, { status: 400 });
  }

  const matchingFiles = await listSearchFiles({ q: "", tags: [tag] });
  const items = filesToTagImageSearchResults(matchingFiles);

  return Response.json(items, {
    status: 200,
    headers: { "Cache-Control": "private, no-store" },
  });
}
