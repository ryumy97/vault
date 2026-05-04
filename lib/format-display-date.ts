/** Short locale-aware stamp for lists and detail rows. */
export function formatDisplayDate(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
