"use client";

import { DirectoryListItem } from "@/components/directory/directory-list-item";
import { FileListItem } from "@/components/file/file-list-item";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Directory, FileRecord } from "@/db/schema";
import { normalizeTags, PRESET_TAGS, tagToneClass } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

type MergedEntry = { type: "directory"; item: Directory } | { type: "file"; item: FileRecord };

type SortKey = "name" | "createdAt" | "sourceFileCreated" | "size";
type SortDir = "asc" | "desc";
type TypeFilter = "all" | "directories" | "files";
type DateRangeFilter = "all" | "today" | "last7" | "last30" | "thisYear" | "lastYear" | "custom";

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

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function computeDateRange(
  range: DateRangeFilter,
  customStart: string,
  customEnd: string,
): { start: Date | null; end: Date | null } {
  const now = new Date();
  switch (range) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "last7": {
      const start = startOfDay(new Date(now));
      start.setDate(start.getDate() - 6);
      return { start, end: endOfDay(now) };
    }
    case "last30": {
      const start = startOfDay(new Date(now));
      start.setDate(start.getDate() - 29);
      return { start, end: endOfDay(now) };
    }
    case "thisYear": {
      return {
        start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
    }
    case "lastYear": {
      const y = now.getFullYear() - 1;
      return { start: new Date(y, 0, 1, 0, 0, 0, 0), end: new Date(y, 11, 31, 23, 59, 59, 999) };
    }
    case "custom": {
      if (!customStart && !customEnd) {
        return { start: null, end: null };
      }
      const start = customStart ? startOfDay(new Date(`${customStart}T00:00:00`)) : null;
      const end = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : null;
      return { start, end };
    }
    default:
      return { start: null, end: null };
  }
}

function toDateInputValue(date: Date | undefined): string {
  if (!date) {
    return "";
  }
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function matchesTagFilter(entry: MergedEntry, selectedTags: string[]): boolean {
  if (selectedTags.length === 0) {
    return true;
  }
  const entryTags = new Set((entry.item.tags ?? []).map((t) => t.toLowerCase()));
  return selectedTags.some((tag) => entryTags.has(tag.toLowerCase()));
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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const merged = useMemo(() => {
    const base = mergeEntries(childDirs, files);
    const { start, end } = computeDateRange(dateRangeFilter, customStartDate, customEndDate);
    const filtered = base.filter((entry) => {
      if (typeFilter === "directories" && entry.type !== "directory") {
        return false;
      }
      if (typeFilter === "files" && entry.type !== "file") {
        return false;
      }
      const createdAtMs = entry.item.createdAt.getTime();
      if (start && createdAtMs < start.getTime()) {
        return false;
      }
      if (end && createdAtMs > end.getTime()) {
        return false;
      }
      return matchesTagFilter(entry, selectedTags);
    });
    return sortEntries(filtered, sortBy, sortDir);
  }, [
    childDirs,
    customEndDate,
    customStartDate,
    dateRangeFilter,
    files,
    selectedTags,
    sortBy,
    sortDir,
    typeFilter,
  ]);

  const availableTags = useMemo(() => {
    const fromEntries = mergeEntries(childDirs, files).flatMap((entry) => entry.item.tags ?? []);
    return normalizeTags([...fromEntries]).sort((a, b) => a.localeCompare(b));
  }, [childDirs, files]);

  const selectedCustomDateRange = useMemo<DateRange | undefined>(() => {
    const from = customStartDate ? new Date(`${customStartDate}T00:00:00`) : undefined;
    const to = customEndDate ? new Date(`${customEndDate}T00:00:00`) : undefined;
    if (!from && !to) {
      return undefined;
    }
    return { from, to };
  }, [customEndDate, customStartDate]);

  const onSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => {
      const normalized = tag.toLowerCase();
      const exists = current.some((t) => t.toLowerCase() === normalized);
      if (exists) {
        return current.filter((t) => t.toLowerCase() !== normalized);
      }
      return [...current, tag];
    });
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setDateRangeFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedTags([]);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-3 ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-end">
          <div className="flex min-w-40 flex-col gap-1 text-xs text-muted-foreground mr-3">
            <span>Type</span>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
              <SelectTrigger className="h-9 w-full min-w-40 bg-background text-sm text-foreground">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="directories">Folders only</SelectItem>
                <SelectItem value="files">Files only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-48 flex-col gap-1 text-xs text-muted-foreground mr-3">
            <span>Date range</span>
            <Select
              value={dateRangeFilter}
              onValueChange={(v) => setDateRangeFilter(v as DateRangeFilter)}
            >
              <SelectTrigger className="h-9 w-full min-w-48 bg-background text-sm text-foreground">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last7">Last 7 days</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
                <SelectItem value="thisYear">This year</SelectItem>
                <SelectItem value="lastYear">Last year</SelectItem>
                <SelectItem value="custom">Custom date range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="h-9 rounded-md border border-input px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        </div>
        <AnimatePresence>
          {dateRangeFilter === "custom" ? (
            <motion.div
              className="flex "
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mt-3 rounded-lg border border-border bg-background p-2">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={selectedCustomDateRange}
                  onSelect={(range) => {
                    setCustomStartDate(toDateInputValue(range?.from));
                    setCustomEndDate(toDateInputValue(range?.to));
                  }}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="mt-3">
          <p className="mb-2 text-xs text-muted-foreground">Tags (match any selected)</p>
          <div className="flex flex-wrap gap-1.5">
            <div className="flex flex-wrap gap-1.5 items-center">
              {PRESET_TAGS.map((tag) => {
                const selected = selectedTags.some((t) => t.toLowerCase() === tag.toLowerCase());

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-md border h-4 w-4",
                      "transition-opacity cursor-pointer",
                      {
                        "opacity-24 hover:opacity-100": !selected,
                      },
                      tagToneClass(tag),
                    )}
                  ></button>
                );
              })}
            </div>
            {availableTags.map((tag) => {
              const selected = selectedTags.some((t) => t.toLowerCase() === tag.toLowerCase());
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
    </div>
  );
}
