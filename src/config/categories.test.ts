import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/routing";
import { sitemapEntries } from "@/lib/seo";
import {
  allToolsSlugs,
  categoryEntries,
  categoryFromSlug,
  categorySlug,
  publishedCategories,
} from "./categories";
import { conversionPages } from "./conversion-pages";
import { translatePathname } from "./routes";
import { toolCategories } from "./tools";

describe("catalog categories", () => {
  it("have unique, URL-safe slugs in every language", () => {
    for (const locale of locales) {
      const slugs = [allToolsSlugs[locale], ...toolCategories.map((c) => categorySlug(c, locale))];
      expect(new Set(slugs).size).toBe(slugs.length);
      slugs.forEach((s) => expect(s).toMatch(/^[a-z0-9-]+$/));
    }
  });

  it("publish only categories with content", () => {
    expect(publishedCategories).toEqual(["image", "pdf", "document", "data", "developer", "utility", "subtitle"]);
    for (const c of publishedCategories) {
      const e = categoryEntries(c);
      expect(e.tools.length + e.conversions.length).toBeGreaterThan(0);
    }
    expect(categoryFromSlug("es", categorySlug("audio", "es"))).toBeUndefined();
  });

  it("put every conversion page in exactly one category", () => {
    const total = publishedCategories.reduce((n, c) => n + categoryEntries(c).conversions.length, 0);
    expect(total).toBe(conversionPages.length);
  });

  it("resolve slugs and translate paths between languages", () => {
    expect(categoryFromSlug("es", "herramientas-pdf")).toBe("pdf");
    expect(categoryFromSlug("en", "image-tools")).toBe("image");
    expect(translatePathname("/herramientas-pdf", "es", "fr")).toBe("/outils-pdf");
    expect(translatePathname("/herramientas", "es", "pt")).toBe("/ferramentas");
    expect(translatePathname("/tools", "en", "es")).toBe("/herramientas");
  });

  it("are in the sitemap in every language", () => {
    const urls = sitemapEntries("https://x.test").map((e) => e.url);
    expect(urls).toContain("https://x.test/es/herramientas");
    expect(urls).toContain("https://x.test/en/pdf-tools");
    expect(urls).toContain("https://x.test/zh/document-tools");
    expect(urls).not.toContain("https://x.test/en/audio-tools");
  });
});
