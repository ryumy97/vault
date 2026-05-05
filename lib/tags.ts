export const PRESET_TAGS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "grey",
] as const;

export function normalizeTags(input: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const tag = raw.trim();
    if (!tag) {
      continue;
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(tag);
  }
  return out;
}

export function parseTagsInput(value: string): string[] {
  return normalizeTags(
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function tagsToInput(tags: string[] | null | undefined): string {
  return (tags ?? []).join(", ");
}

export function tagToneClass(tag: string): string {
  switch (tag.trim().toLowerCase()) {
    case "red":
      return "bg-tag-red text-tag-red";
    case "orange":
      return "bg-tag-orange text-tag-orange";
    case "yellow":
      return "bg-tag-yellow text-tag-yellow";
    case "green":
      return "bg-tag-green text-tag-green";
    case "blue":
      return "bg-tag-blue text-tag-blue";
    case "purple":
      return "bg-tag-purple text-tag-purple";
    case "grey":
    case "gray":
      return "bg-tag-grey text-tag-grey";
    default:
      return "bg-muted text-muted-foreground";
  }
}
