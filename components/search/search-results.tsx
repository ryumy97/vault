"use client";

import { GridIcon, ListIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { setDirectoryViewModeAction } from "@/app/actions/server/set-directory-view-mode";
import { DirectoryGridItem } from "@/components/directory/directory-grid-item";
import { DirectoryListItem } from "@/components/directory/directory-list-item";
import { FileGridItem } from "@/components/file/file-grid-item";
import { FileListItem } from "@/components/file/file-list-item";
import { SearchPagination } from "@/components/search/search-pagination";
import { TagFilters } from "@/components/tag-filters";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SearchEntry } from "@/db/actions";
import { buildSearchHref } from "@/lib/search";
import { cn } from "@/lib/utils";
import type { DirectoryViewMode } from "@/lib/view-mode";

type SearchResultsProps = {
  q: string;
  tags: string[];
  page: number;
  totalCount: number;
  pageSize: number;
  entries: SearchEntry[];
  availableTags: string[];
  viewMode: DirectoryViewMode;
};

export function SearchResults({
  q,
  tags,
  page,
  totalCount,
  pageSize,
  entries,
  availableTags,
  viewMode,
}: SearchResultsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [queryInput, setQueryInput] = useState(q);
  const [currentViewMode, setCurrentViewMode] = useState<DirectoryViewMode>(viewMode);

  useEffect(() => {
    setQueryInput(q);
  }, [q]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasFilters = q.length > 0 || tags.length > 0;

  const viewCounts = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        if (entry.type === "directory") {
          acc.folders += 1;
        } else {
          acc.files += 1;
        }
        return acc;
      },
      { folders: 0, files: 0 },
    );
  }, [entries]);

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  const toggleTag = (tag: string) => {
    const normalized = tag.toLowerCase();
    const exists = tags.some((t) => t.toLowerCase() === normalized);
    const next = exists ? tags.filter((t) => t.toLowerCase() !== normalized) : [...tags, tag];
    navigate(buildSearchHref({ q, tags: next, page: 1 }));
  };

  const clearTags = () => {
    navigate(buildSearchHref({ q, tags: [], page: 1 }));
  };

  const submitQuery = (event: React.FormEvent) => {
    event.preventDefault();
    const nextQ = queryInput.trim();
    if (!nextQ) {
      return;
    }
    navigate(buildSearchHref({ q: nextQ, tags, page: 1 }));
  };

  return (
    <div className="mx-auto xl:my-6 w-full flex-1 px-6 py-6 xl:max-w-6xl xl:rounded-4xl bg-background">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find files and folders across the archive. Press{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
            ⌘K
          </kbd>{" "}
          anywhere to open search.
        </p>
      </header>

      <form onSubmit={submitQuery} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Search by name or folder path…"
            className="h-10 pl-9"
            aria-label="Search query"
          />
        </div>
        <button
          type="submit"
          className="h-10 shrink-0 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
        >
          Search
        </button>
      </form>

      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-3 ring-1 ring-foreground/10">
          <TagFilters
            availableTags={availableTags}
            selectedTags={tags}
            onToggleTag={toggleTag}
            onClearTags={clearTags}
          />
        </div>

        {!hasFilters ? (
          <p className="text-sm text-muted-foreground">
            Enter a search term or select tags to see results.
          </p>
        ) : totalCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            No files or folders match
            {q ? (
              <>
                {" "}
                <span className="font-medium text-foreground">&ldquo;{q}&rdquo;</span>
              </>
            ) : null}
            {tags.length > 0 ? " with the selected tags" : null}.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="px-1 text-xs text-muted-foreground">
                {totalCount} {totalCount === 1 ? "result" : "results"}
                {totalPages > 1 ? (
                  <>
                    {" "}
                    · page {page} of {totalPages}
                  </>
                ) : null}
                {viewCounts.folders > 0 || viewCounts.files > 0 ? (
                  <>
                    {" "}
                    · {viewCounts.folders} {viewCounts.folders === 1 ? "folder" : "folders"} and{" "}
                    {viewCounts.files} {viewCounts.files === 1 ? "file" : "files"} on this page
                  </>
                ) : null}
              </p>
              <ToggleGroup
                type="single"
                variant="outline"
                value={currentViewMode}
                onValueChange={(value) => {
                  if (value === "list" || value === "grid") {
                    setCurrentViewMode(value);
                    void setDirectoryViewModeAction(value);
                  }
                }}
              >
                <ToggleGroupItem value="list" aria-label="List view">
                  <ListIcon className="size-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="grid" aria-label="Grid view">
                  <GridIcon className="size-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card ring-1 ring-foreground/10">
              <div
                className={cn(
                  "min-w-[640px] text-sm grid",
                  currentViewMode === "grid" && "grid-cols-5",
                  currentViewMode === "list" &&
                    "grid-cols-[minmax(5.5rem,0.9fr)_minmax(12rem,2.2fr)_minmax(9rem,1.1fr)_minmax(10rem,1.2fr)_minmax(7rem,0.9fr)_3rem]",
                )}
              >
                {currentViewMode === "list" ? (
                  <div className="border-border bg-muted/40 grid grid-cols-subgrid col-span-full border-b">
                    <div className="h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center">
                      Type
                    </div>
                    <div className="h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center">
                      Name
                    </div>
                    <div className="h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center">
                      Date created
                    </div>
                    <div className="h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center">
                      Source file created
                    </div>
                    <div className="h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-end">
                      File size
                    </div>
                    <div className="w-12 px-2">
                      <span className="sr-only">Actions</span>
                    </div>
                  </div>
                ) : null}
                {currentViewMode === "list" &&
                  entries.map((entry) =>
                    entry.type === "directory" ? (
                      <DirectoryListItem key={entry.item.id} directory={entry.item} />
                    ) : (
                      <FileListItem key={entry.item.id} file={entry.item} />
                    ),
                  )}
              </div>
            </div>

            {currentViewMode === "grid" ? (
              <div className="grid grid-cols-5 gap-4">
                {entries.map((entry) =>
                  entry.type === "directory" ? (
                    <DirectoryGridItem key={entry.item.id} directory={entry.item} />
                  ) : (
                    <FileGridItem key={entry.item.id} file={entry.item} />
                  ),
                )}
              </div>
            ) : null}

            <SearchPagination q={q} tags={tags} page={page} totalPages={totalPages} />

            <p className="text-center text-xs text-muted-foreground">
              <Link href="/dir" className="underline-offset-4 hover:underline">
                Browse all folders
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
