import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SearchResults } from "@/components/search/search-results";
import { searchArchive } from "@/db/actions";
import { buildSearchHref, parseSearchParams } from "@/lib/search";
import { DIRECTORY_VIEW_MODE_COOKIE, parseDirectoryViewMode } from "@/lib/view-mode";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function SearchPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <SearchPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchPageContent({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const viewMode = parseDirectoryViewMode(cookieStore.get(DIRECTORY_VIEW_MODE_COOKIE)?.value);

  const params = await searchParams;
  const { q, tags, page } = parseSearchParams(params);

  const result = await searchArchive({ q, tags, page });

  const maxPage = Math.max(1, Math.ceil(result.totalCount / result.pageSize));
  const effectivePage = Math.min(page, maxPage);

  if (effectivePage !== page && result.totalCount > 0) {
    redirect(buildSearchHref({ q, tags, page: effectivePage }));
  }

  return (
    <SearchResults
      q={q}
      tags={tags}
      page={effectivePage}
      totalCount={result.totalCount}
      fileCount={result.fileCount}
      pageSize={result.pageSize}
      entries={result.entries}
      availableTags={result.availableTags}
      viewMode={viewMode}
    />
  );
}
