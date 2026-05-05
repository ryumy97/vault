"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { DirectoryListItem } from "@/components/directory/directory-list-item";
import { FileListItem } from "@/components/file/file-list-item";
import type { Directory, FileRecord } from "@/db/schema";
import { cn } from "@/lib/utils";

type MergedEntry = { type: "directory"; item: Directory } | { type: "file"; item: FileRecord };

type SortKey = "name" | "createdAt" | "sourceFileCreated" | "size";
type SortDir = "asc" | "desc";

function mergeEntries(childDirs: Directory[], fileRecords: FileRecord[]): MergedEntry[] {
  return [
    ...childDirs.map((item) => ({ type: "directory" as const, item })),
    ...fileRecords.map((item) => ({ type: "file" as const, item })),
  ];
}

function tieBreak(a: MergedEntry, b: MergedEntry): number {
  const nameCmp = a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" });
  if (nameCmp !== 0) {
    return nameCmp;
  }
  if (a.type !== b.type) {
    return a.type === "directory" ? -1 : 1;
  }
  return a.item.id.localeCompare(b.item.id);
}

function compareEntries(a: MergedEntry, b: MergedEntry, sortBy: SortKey, sortDir: SortDir): number {
  const dir = sortDir === "asc" ? 1 : -1;
  let cmp = 0;
  /** When true, `cmp` is already the final signed order (e.g. nulls-last for source dates). */
  let skipDir = false;

  switch (sortBy) {
    case "name":
      cmp = a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" });
      break;
    case "createdAt":
      cmp = a.item.createdAt.getTime() - b.item.createdAt.getTime();
      break;
    case "sourceFileCreated": {
      const aMs =
        a.type === "file" && a.item.sourceFileCreatedAt
          ? a.item.sourceFileCreatedAt.getTime()
          : null;
      const bMs =
        b.type === "file" && b.item.sourceFileCreatedAt
          ? b.item.sourceFileCreatedAt.getTime()
          : null;
      if (aMs === null && bMs === null) {
        cmp = 0;
      } else if (aMs === null) {
        cmp = 1;
        skipDir = true;
      } else if (bMs === null) {
        cmp = -1;
        skipDir = true;
      } else {
        cmp = aMs - bMs;
      }
      break;
    }
    case "size": {
      const sa = a.type === "file" ? a.item.sizeBytes : BigInt(0);
      const sb = b.type === "file" ? b.item.sizeBytes : BigInt(0);
      if (sa < sb) {
        cmp = -1;
      } else if (sa > sb) {
        cmp = 1;
      } else {
        cmp = 0;
      }
      break;
    }
    default:
      break;
  }

  if (cmp !== 0) {
    return skipDir ? cmp : dir * cmp;
  }
  return tieBreak(a, b);
}

function sortEntries(entries: MergedEntry[], sortBy: SortKey, sortDir: SortDir): MergedEntry[] {
  return [...entries].sort((a, b) => compareEntries(a, b, sortBy, sortDir));
}

type DirectoryContentsTableProps = {
  childDirs: Directory[];
  files: FileRecord[];
};

function SortableTh({
  sortKey,
  activeKey,
  sortDir,
  onSort,
  align = "left",
  children,
}: {
  sortKey: SortKey;
  activeKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
  children: ReactNode;
}) {
  const active = activeKey === sortKey;
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(
        "h-10 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex max-w-full items-center gap-1 rounded-md py-1 -my-1 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          align === "right" && "w-full justify-end",
        )}
      >
        <span className="whitespace-nowrap">{children}</span>
        {active ? (
          sortDir === "asc" ? (
            <ChevronUp className="size-3.5 shrink-0 text-foreground" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5 shrink-0 text-foreground" aria-hidden />
          )
        ) : null}
      </button>
    </th>
  );
}

export function DirectoryContentsTable({ childDirs, files }: DirectoryContentsTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const merged = useMemo(() => {
    const base = mergeEntries(childDirs, files);
    return sortEntries(base, sortBy, sortDir);
  }, [childDirs, files, sortBy, sortDir]);

  const onSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card ring-1 ring-foreground/10">
      <table className="w-full min-w-[640px] caption-bottom text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <SortableTh sortKey="name" activeKey={sortBy} sortDir={sortDir} onSort={onSort}>
              Name
            </SortableTh>
            <SortableTh sortKey="createdAt" activeKey={sortBy} sortDir={sortDir} onSort={onSort}>
              Date created
            </SortableTh>
            <SortableTh
              sortKey="sourceFileCreated"
              activeKey={sortBy}
              sortDir={sortDir}
              onSort={onSort}
            >
              Source file created
            </SortableTh>
            <SortableTh
              sortKey="size"
              activeKey={sortBy}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            >
              File size
            </SortableTh>
            <th scope="col" className="w-12 px-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {merged.map((entry) =>
            entry.type === "directory" ? (
              <DirectoryListItem key={entry.item.id} directory={entry.item} />
            ) : (
              <FileListItem key={entry.item.id} file={entry.item} />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
