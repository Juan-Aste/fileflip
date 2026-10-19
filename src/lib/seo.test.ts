import { describe, expect, it } from "vitest";
import { alternatesFor, sitemapEntries } from "./seo";

describe("alternatesFor", () => {
  it("lists every language plus x-default", () => {
    const alt = alternatesFor("pt", (l) => (l === "es" ? "/unir-pdf" : "/merge-pdf"));
    expect(alt.canonical).toBe("/pt/merge-pdf");
    expect(alt.languages).toMatchObject({ es: "/es/unir-pdf", en: "/en/merge-pdf", "x-default": "/es/unir-pdf" });
  });
});

describe("sitemapEntries", () => {
  const entries = sitemapEntries("https://fileflip.app");

  it("includes home, tools and conversion pages in every language", () => {
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://fileflip.app/es");
    expect(urls).toContain("https://fileflip.app/zh");
    expect(urls).toContain("https://fileflip.app/es/unir-pdf");
    expect(urls).toContain("https://fileflip.app/fr/heic-en-jpg");
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("links each URL to its translations", () => {
    const entry = entries.find((e) => e.url === "https://fileflip.app/en/jpg-to-webp");
    expect(entry?.alternates?.languages).toMatchObject({
      es: "https://fileflip.app/es/jpg-a-webp",
      pt: "https://fileflip.app/pt/jpg-para-webp",
    });
  });

  it("leaves out private pages", () => {
    expect(entries.some((e) => /\/(account|login)/.test(e.url))).toBe(false);
  });
});
