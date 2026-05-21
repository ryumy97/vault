import { listArchiveTags } from "@/db/actions";

import { SearchPalette } from "./search-palette";

export async function SearchPaletteRoot() {
  const availableTags = await listArchiveTags();
  return <SearchPalette availableTags={availableTags} />;
}
