import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allToolsSlugs } from "@/config/categories";
import { conversionFromSlug } from "@/config/conversion-pages";
import { creditsSlugs } from "@/config/credits";
import { translatePathname } from "@/config/routes";
import { availableTools, toolFromSlug } from "@/config/tools";
import { locales } from "@/i18n/routing";
import { renderGuide, shotSrc } from "@/lib/guides/render";
import { guideJsonLd } from "@/lib/guides/schema";
import { sitemapEntries } from "@/lib/seo";
import { guideBodies } from "./bodies";
import { guideLocales, guidePath, guides, guidesFor, guidesSlugs, plannedGuideIds } from "./meta";
import images from "./images.json";

// Content rules for the guides (PLAN.md, phase 10E): 800–1500 words, every
// link and screenshot resolves, real tools only, no slug clashes.
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

describe("guides section", () => {
  it("does not clash with other pages", () => {
    for (const l of locales) {
      const slug = guidesSlugs[l];
      expect(toolFromSlug(l, slug)).toBeUndefined();
      expect(conversionFromSlug(l, slug)).toBeUndefined();
      expect([allToolsSlugs[l], creditsSlugs[l]]).not.toContain(slug);
    }
  });

  it("has an index only in languages with guides", () => {
    for (const l of locales) expect(guideLocales.includes(l)).toBe(guidesFor(l).length > 0);
  });
});

describe.each(guides)("guide $id", (guide) => {
  const published = locales.filter((l) => guide.versions[l]);

  it("has valid dates, tools and related guides", () => {
    expect(plannedGuideIds).toContain(guide.id);
    expect(guide.published).toMatch(isoDate);
    expect(guide.updated).toMatch(isoDate);
    expect(guide.updated >= guide.published).toBe(true);
    expect(guide.tools.length).toBeGreaterThan(0);
    for (const id of guide.tools) expect(availableTools).toContain(id);
    for (const id of guide.related) expect(plannedGuideIds).toContain(id);
    expect(guide.related).not.toContain(guide.id);
  });

  it.each(published)("in %s: body, length, links and screenshots", (l) => {
    const body = guideBodies[guide.id]?.[l];
    expect(body, "body").toBeTruthy();
    const r = renderGuide(body!, l);
    const [min, max] = l === "zh" ? [1400, 3600] : [800, 1500];
    expect(r.words).toBeGreaterThanOrEqual(min);
    expect(r.words).toBeLessThanOrEqual(max);
    expect(r.toc.length).toBeGreaterThanOrEqual(3);
    if (guide.howTo) expect(r.steps.length).toBeGreaterThanOrEqual(3);
    if (guide.image) expect(r.shots[0]?.split(".")[0]).toBe(guide.image);
    for (const shot of r.shots) {
      // Screenshots of the page in the guide's own language.
      if (l !== "es") expect(shot, "shot in the guide's language").toMatch(new RegExp(`\\.${l}$`));
      expect(existsSync(path.join("public", shotSrc(shot))), shot).toBe(true);
      expect((images as Record<string, unknown>)[shot]).toBeTruthy();
    }
    const v = guide.versions[l]!;
    expect(v.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(v.description.length).toBeLessThanOrEqual(170);
    expect(guides.filter((g) => g.versions[l]?.slug === v.slug)).toHaveLength(1);
  });

  it("is in the sitemap and the language switcher in each language", () => {
    const urls = sitemapEntries("https://x.test").map((e) => e.url);
    for (const l of published) {
      expect(urls).toContain(`https://x.test/${l}${guidePath(guide, l)}`);
      for (const to of locales) {
        const translated = translatePathname(guidePath(guide, l)!, l, to);
        expect(translated).toBe(guidePath(guide, to) ?? (guideLocales.includes(to) ? `/${guidesSlugs[to]}` : "/"));
      }
    }
  });

  it("publishes Article and breadcrumb structured data", () => {
    const l = published[0];
    const ld = guideJsonLd({ guide, locale: l, rendered: renderGuide(guideBodies[guide.id]![l]!, l), base: "https://x.test", names: { home: "H", index: "G", author: "A" } });
    expect(ld[0]).toMatchObject({ "@type": "Article", datePublished: guide.published, dateModified: guide.updated, author: { name: "A" } });
    expect(ld.at(-1)).toMatchObject({ "@type": "BreadcrumbList" });
    expect(ld.some((d) => d["@type"] === "HowTo")).toBe(!!guide.howTo);
  });
});
