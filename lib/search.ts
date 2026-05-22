import { normalizeTags } from "@/lib/tags";

export const SEARCH_PAGE_SIZE = 30;

export type SearchParams = {
  q: string;
  tags: string[];
  page: number;
};

export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

export function parseSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): SearchParams {
  const rawQ = searchParams.q;
  const q = (Array.isArray(rawQ) ? rawQ[0] : (rawQ ?? "")).trim();

  const rawTags = searchParams.tags;
  const tagsRaw = Array.isArray(rawTags) ? rawTags.join(",") : (rawTags ?? "");
  const tags = normalizeTags(
    tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const rawPage = searchParams.page;
  const pageStr = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);

  return { q, tags, page };
}

export function buildSearchHref(params: { q?: string; tags?: string[]; page?: number }): string {
  const sp = new URLSearchParams();
  const q = params.q?.trim();
  if (q) {
    sp.set("q", q);
  }
  const tags = normalizeTags(params.tags ?? []);
  if (tags.length > 0) {
    sp.set("tags", tags.join(","));
  }
  if (params.page && params.page > 1) {
    sp.set("page", String(params.page));
  }
  const qs = sp.toString();
  return qs ? `/search?${qs}` : "/search";
}

/** Authenticated GET route: ZIP of all files matching search filters (all pages). */
export function hrefForSearchZipDownload(params: { q?: string; tags?: string[] }): string {
  const sp = new URLSearchParams();
  const q = params.q?.trim();
  if (q) {
    sp.set("q", q);
  }
  const tags = normalizeTags(params.tags ?? []);
  if (tags.length > 0) {
    sp.set("tags", tags.join(","));
  }
  const qs = sp.toString();
  return qs ? `/api/search/zip?${qs}` : "/api/search/zip";
}
