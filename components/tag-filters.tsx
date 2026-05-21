"use client";

import { PRESET_TAGS, tagToneClass } from "@/lib/tags";
import { cn } from "@/lib/utils";

type TagFiltersProps = {
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearTags?: () => void;
  className?: string;
};

export function TagFilters({
  availableTags,
  selectedTags,
  onToggleTag,
  onClearTags,
  className,
}: TagFiltersProps) {
  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Tags (match any selected)</p>
        {onClearTags && selectedTags.length > 0 ? (
          <button
            type="button"
            onClick={onClearTags}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear tags
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_TAGS.map((tag) => {
            const selected = selectedTags.some((t) => t.toLowerCase() === tag.toLowerCase());
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(tag)}
                className={cn(
                  "h-4 w-4 cursor-pointer rounded-md border transition-opacity",
                  {
                    "opacity-24 hover:opacity-100": !selected,
                  },
                  tagToneClass(tag),
                )}
                aria-label={tag}
                aria-pressed={selected}
              />
            );
          })}
        </div>
        {availableTags.map((tag) => {
          const selected = selectedTags.some((t) => t.toLowerCase() === tag.toLowerCase());
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs",
                selected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={selected}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
