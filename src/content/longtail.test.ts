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

describe("conversion pages of old video and audio formats", () => {
  const slugs: Record<string, string[]> = {
    es: ["avi-a-mp4", "wmv-a-mp4", "flv-a-mp4", "mpg-a-mp4", "wma-a-mp3", "amr-a-mp3"],
    en: ["avi-to-mp4", "wmv-to-mp4", "flv-to-mp4", "mpg-to-mp4", "wma-to-mp3", "amr-to-mp3"],
    pt: ["avi-para-mp4", "wmv-para-mp4", "flv-para-mp4", "mpg-para-mp4", "wma-para-mp3", "amr-para-mp3"],
    fr: ["avi-en-mp4", "wmv-en-mp4", "flv-en-mp4", "mpg-en-mp4", "wma-en-mp3", "amr-en-mp3"],
    zh: ["avi-to-mp4", "wmv-to-mp4", "flv-to-mp4", "mpg-to-mp4", "wma-to-mp3", "amr-to-mp3"],
  };

  it("exist in the 5 languages, linked to each other, with the right tool", () => {
    for (const [locale, list] of Object.entries(slugs)) {
      for (const slug of list) {
        const page = longtailFromSlug(locale as never, slug);
        expect(page, `${locale}/${slug}`).toBeDefined();
        expect(Object.keys(page!.translations ?? {}).sort()).toEqual(["en", "es", "fr", "pt", "zh"].filter((l) => l !== locale));
        expect(page!.widget).toEqual({ kind: "tool", tool: slug.endsWith("mp3") ? "audio-converter" : "video-converter" });
        expect(page!.faq.length).toBeGreaterThanOrEqual(4);
        // Their own text: the first paragraph and question differ between formats.
        expect(page!.intro[0]!.length).toBeGreaterThan(40);
      }
      const intros = list.map((s) => longtailFromSlug(locale as never, s)!.intro[0]);
      expect(new Set(intros).size).toBe(list.length);
    }
  });
});
