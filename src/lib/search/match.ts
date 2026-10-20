// Catalog search, shared by the server (index) and the client (matching).
// Pure functions: no engines or catalog data are imported here.

export type SearchKind = "tool" | "category" | "conversion" | "guide";

export interface SearchEntry {
  kind: SearchKind;
  href: string;
  title: string;
  description?: string;
  /** Extra words that match but are not shown (formats, category names...). */
  keywords: string;
}

/** Lowercase, without accents or punctuation, so "imágenes" matches "imagenes". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const kindWeight: Record<SearchKind, number> = { tool: 3, category: 2, conversion: 1, guide: 1 };

/**
 * Entries containing every word of the query, best first: title matches
 * beat description or keyword matches, word starts beat inner matches.
 */
export function searchEntries(entries: readonly SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of entries) {
    const title = ` ${normalize(entry.title)}`;
    const rest = ` ${normalize(`${entry.description ?? ""} ${entry.keywords}`)}`;
    let score = 0;
    let all = true;
    for (const w of words) {
      if (title.includes(` ${w}`)) score += 10;
      else if (title.includes(w)) score += 6;
      else if (rest.includes(` ${w}`)) score += 3;
      else if (rest.includes(w)) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (!all) continue;
    if (normalize(entry.title) === words.join(" ")) score += 20;
    scored.push({ entry, score: score * 10 + kindWeight[entry.kind] });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.entry.title.length - b.entry.title.length)
    .slice(0, limit)
    .map((s) => s.entry);
}
