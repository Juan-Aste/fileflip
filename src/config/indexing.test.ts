import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/routing";
import { sitemapEntries } from "@/lib/seo";
import { conversionPages, conversionSlug } from "./conversion-pages";
import { categorySlug, publishedCategories } from "./categories";
import { indexedConversionPairs, isIndexedCategory, isIndexedConversion, isIndexedTool, noindexTools } from "./indexing";
import { availableTools, tools } from "./tools";

describe("indexing", () => {
  it("indexes 30 to 60 existing conversions, each once", () => {
    expect(indexedConversionPairs.length).toBeGreaterThanOrEqual(30);
    expect(indexedConversionPairs.length).toBeLessThanOrEqual(60);
    const keys = indexedConversionPairs.map(([from, to]) => `${from}>${to}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const [from, to] of indexedConversionPairs) {
      expect(conversionPages.some((c) => c.from === from && c.to === to), `${from}>${to}`).toBe(true);
    }
  });

  it("keeps the big categories indexed and the one- or two-tool ones out", () => {
    for (const c of ["image", "pdf", "document", "data", "audio", "video"] as const) expect(isIndexedCategory(c), c).toBe(true);
    for (const c of ["font", "cad", "3d"] as const) expect(isIndexedCategory(c), c).toBe(false);
  });

  it("only noindexes published tools", () => {
    for (const id of noindexTools) expect(availableTools).toContain(id);
  });

  it("the sitemap lists indexable pages only, and every indexable one", () => {
    const urls = new Set(sitemapEntries("https://x").map((e) => e.url));
    for (const locale of locales) {
      for (const c of conversionPages) {
        expect(urls.has(`https://x/${locale}/${conversionSlug(c, locale)}`), conversionSlug(c, locale)).toBe(isIndexedConversion(c));
      }
      for (const c of publishedCategories) {
        expect(urls.has(`https://x/${locale}/${categorySlug(c, locale)}`), c).toBe(isIndexedCategory(c));
      }
      for (const id of availableTools) {
        expect(urls.has(`https://x/${locale}/${tools[id].slugs[locale]}`), id).toBe(isIndexedTool(id));
      }
    }
  });
});
