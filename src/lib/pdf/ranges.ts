/**
 * Parses page ranges typed by a user ("1-3, 5, 8-") into groups of 0-based
 * page indices. Open ranges run to the last page ("8-") or from the first
 * ("-3"). Returns null when the text is invalid or out of bounds.
 */
export function parsePageRanges(text: string, pageCount: number): number[][] | null {
  const parts = text.split(/[,;]/).map((p) => p.replace(/\s+/g, "")).filter(Boolean);
  if (!parts.length) return null;
  const groups: number[][] = [];
  for (const part of parts) {
    const match = part.match(/^(\d*)(?:[-–](\d*))?$/);
    if (!match || (match[1] === "" && !match[2])) return null;
    const isRange = match[2] !== undefined;
    const start = match[1] === "" ? 1 : Number(match[1]);
    const end = isRange ? (match[2] === "" ? pageCount : Number(match[2])) : start;
    if (start < 1 || end > pageCount || start > end) return null;
    groups.push(Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i));
  }
  return groups;
}

/** Human label for a group of 0-based pages, e.g. [0,1,2] → "1-3". */
export function rangeLabel(group: readonly number[]): string {
  if (!group.length) return "";
  const first = group[0] + 1;
  const last = group[group.length - 1] + 1;
  return first === last ? String(first) : `${first}-${last}`;
}

/** Sorted, de-duplicated 0-based pages written as ranges: [0,1,2,4] → "1-3, 5". */
export function formatPageRanges(pages: Iterable<number>): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    parts.push(rangeLabel(sorted.slice(i, j + 1)));
    i = j + 1;
  }
  return parts.join(", ");
}
