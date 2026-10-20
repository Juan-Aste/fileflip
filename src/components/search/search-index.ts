import type { SearchEntry } from "@/lib/search/match";

const cache = new Map<string, Promise<SearchEntry[]>>();

/** Static per-language index (see app/api/search-index), fetched once per page view. */
export function loadSearchIndex(locale: string): Promise<SearchEntry[]> {
  let p = cache.get(locale);
  if (!p) {
    p = fetch(`/api/search-index/${locale}`).then((r) => {
      if (!r.ok) throw new Error(`search index ${r.status}`);
      return r.json() as Promise<SearchEntry[]>;
    });
    // A failed load can be retried by opening the dialog again.
    p.catch(() => cache.delete(locale));
    cache.set(locale, p);
  }
  return p;
}

export function prefetchSearchIndex(locale: string) {
  loadSearchIndex(locale).catch(() => {});
}
