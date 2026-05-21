"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TagFilters } from "@/components/tag-filters";
import { Command, CommandDialog, CommandInput } from "@/components/ui/command";
import { buildSearchHref } from "@/lib/search";
import { isPresetTag } from "@/lib/tags";

type SearchPaletteProps = {
  availableTags: string[];
};

function toggleTagInList(current: string[], tag: string): string[] {
  const normalized = tag.toLowerCase();
  const exists = current.some((t) => t.toLowerCase() === normalized);
  if (exists) {
    return current.filter((t) => t.toLowerCase() !== normalized);
  }
  return [...current, tag];
}

export function SearchPalette({ availableTags }: SearchPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const customTags = useMemo(
    () => availableTags.filter((tag) => !isPresetTag(tag)),
    [availableTags],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setSelectedTags([]);
  }, []);

  const runSearch = useCallback(() => {
    const q = query.trim();
    if (!q && selectedTags.length === 0) {
      return;
    }
    router.push(buildSearchHref({ q: q || undefined, tags: selectedTags }));
    setOpen(false);
    reset();
  }, [query, reset, router, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => toggleTagInList(current, tag));
  };

  const canSubmit = query.trim().length > 0 || selectedTags.length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
      title="Search"
      description="Search files and folders by name or tag"
    >
      <Command
        shouldFilter={false}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            runSearch();
          }
        }}
      >
        <CommandInput
          placeholder="Search files and folders…"
          value={query}
          onValueChange={setQuery}
        />
        <div
          className="border-t border-border px-3 py-3"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <TagFilters
            availableTags={customTags}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            onClearTags={() => setSelectedTags([])}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            {canSubmit
              ? "Press Enter to search"
              : "Type a query and/or select tags, then press Enter"}
          </p>
        </div>
      </Command>
    </CommandDialog>
  );
}
