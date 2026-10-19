import { describe, expect, it } from "vitest";
import { conversionFromSlug } from "@/config/conversion-pages";
import { findConversion } from "@/config/formats";
import { toolFromSlug } from "@/config/tools";
import { faqJsonLd, longtailById, longtailFromSlug, longtailPages, longtailTranslation } from "./longtail";

describe("long-tail pages data", () => {
  it("has unique ids and unique slugs per language", () => {
    expect(new Set(longtailPages.map((p) => p.id)).size).toBe(longtailPages.length);
    const keys = longtailPages.map((p) => `${p.locale}:${p.slug}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never collides with tool or conversion slugs", () => {
    for (const p of longtailPages) {
      expect(toolFromSlug(p.locale, p.slug), p.slug).toBeUndefined();
      expect(conversionFromSlug(p.locale, p.slug), p.slug).toBeUndefined();
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("is complete enough to be useful", () => {
    for (const p of longtailPages) {
      expect(p.metaDescription.length, p.id).toBeLessThanOrEqual(170);
      expect(p.intro.length, p.id).toBeGreaterThan(0);
      expect(p.faq.length, p.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("only uses conversions that exist", () => {
    for (const p of longtailPages) {
      if (p.widget.kind === "converter" && p.widget.from && p.widget.to) {
        expect(findConversion(p.widget.from, p.widget.to), p.id).toBeDefined();
      }
    }
  });

  it("has translations that point back to existing pages in the right language", () => {
    for (const p of longtailPages) {
      for (const [locale, id] of Object.entries(p.translations ?? {})) {
        expect(longtailById(id!)?.locale, `${p.id} → ${id}`).toBe(locale);
      }
    }
  });

  it("finds pages by slug and translation", () => {
    const page = longtailFromSlug("es", "heic-a-jpg-desde-iphone")!;
    expect(page.id).toBe("heic-jpg-iphone-es");
    expect(longtailTranslation(page, "es")).toBe(page);
    expect(longtailFromSlug("en", "heic-a-jpg-desde-iphone")).toBeUndefined();
  });

  it("builds FAQPage structured data", () => {
    const ld = faqJsonLd(longtailPages[0]);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity[0]).toMatchObject({ "@type": "Question", acceptedAnswer: { "@type": "Answer" } });
  });
});
