import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/routing";
import { conversionFromSlug, conversionPages, conversionSlug, relatedConversions } from "./conversion-pages";
import { translatePathname } from "./routes";
import { toolIds, tools } from "./tools";

describe("conversion slugs", () => {
  it("are translated per language", () => {
    const c = { from: "jpg", to: "webp" } as const;
    expect(conversionSlug(c, "es")).toBe("jpg-a-webp");
    expect(conversionSlug(c, "en")).toBe("jpg-to-webp");
    expect(conversionSlug(c, "pt")).toBe("jpg-para-webp");
    expect(conversionSlug(c, "fr")).toBe("jpg-en-webp");
    expect(conversionSlug({ from: "docx", to: "pdf" }, "es")).toBe("word-a-pdf");
    expect(conversionSlug({ from: "pdf", to: "docx" }, "pt")).toBe("pdf-para-word");
  });

  it("round-trip and never collide with each other or with tools", () => {
    for (const locale of locales) {
      const slugs = conversionPages.map((c) => conversionSlug(c, locale));
      expect(new Set(slugs).size).toBe(slugs.length);
      const toolSlugs = new Set(toolIds.map((id) => tools[id].slugs[locale]));
      for (const c of conversionPages) {
        const slug = conversionSlug(c, locale);
        expect(toolSlugs.has(slug)).toBe(false);
        expect(conversionFromSlug(locale, slug)).toEqual(c);
      }
    }
    expect(conversionFromSlug("es", "jpg-to-webp")).toBeUndefined();
  });

  it("are translated when switching language", () => {
    expect(translatePathname("/heic-a-jpg", "es", "fr")).toBe("/heic-en-jpg");
  });
});

describe("relatedConversions", () => {
  it("links conversions sharing the input or the output", () => {
    const related = relatedConversions({ from: "heic", to: "jpg", engine: "browser" });
    expect(related.length).toBeLessThanOrEqual(8);
    expect(related.every((c) => c.from === "heic" || c.to === "jpg")).toBe(true);
    expect(related.some((c) => c.from === "heic" && c.to === "jpg")).toBe(false);
  });
});
