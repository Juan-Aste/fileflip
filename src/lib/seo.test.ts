import { describe, expect, it } from "vitest";
import { alternatesFor, configuredSiteUrl, sitemapEntries, softwareApplicationJsonLd } from "./seo";

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
    expect(urls).toContain("https://fileflip.app/es/creditos");
    expect(urls).toContain("https://fileflip.app/zh/credits");
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("links each URL to its translations", () => {
    const entry = entries.find((e) => e.url === "https://fileflip.app/en/jpg-to-webp");
    expect(entry?.alternates?.languages).toMatchObject({
      es: "https://fileflip.app/es/jpg-a-webp",
      pt: "https://fileflip.app/pt/jpg-para-webp",
    });
  });

  it("includes long-tail pages only in their own language", () => {
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://fileflip.app/es/heic-a-jpg-desde-iphone");
    expect(urls).not.toContain("https://fileflip.app/en/heic-a-jpg-desde-iphone");
  });

  it("leaves out private pages", () => {
    expect(entries.some((e) => /\/(account|login)/.test(e.url))).toBe(false);
  });
});

describe("softwareApplicationJsonLd", () => {
  it("describes a free web tool", () => {
    const data = softwareApplicationJsonLd({
      name: "Unir PDF",
      description: "Combina PDF",
      url: "https://example.com/es/unir-pdf",
      locale: "es",
    });
    expect(data).toMatchObject({
      "@type": "SoftwareApplication",
      name: "Unir PDF",
      url: "https://example.com/es/unir-pdf",
      inLanguage: "es",
      isAccessibleForFree: true,
      offers: { price: "0" },
    });
  });
});

describe("configuredSiteUrl", () => {
  it("normalizes a valid origin", () => {
    expect(configuredSiteUrl("https://fileflect.app/")).toBe("https://fileflect.app");
    expect(configuredSiteUrl(" http://localhost:3000 ")).toBe("http://localhost:3000");
  });

  it("adds https:// to a bare host", () => {
    expect(configuredSiteUrl("app-production.up.railway.app")).toBe("https://app-production.up.railway.app");
  });

  it("ignores missing, empty or invalid values instead of throwing (every page would be a 500)", () => {
    for (const raw of [undefined, "", "   ", "http://", "ftp://example.com", "not a url"]) {
      expect(configuredSiteUrl(raw)).toBeUndefined();
    }
  });
});
