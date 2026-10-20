import { describe, expect, it } from "vitest";
import { longtailPages } from "@/content/longtail";
import { locales } from "@/i18n/routing";
import { allToolsSlugs, categorySlug, publishedCategories } from "./categories";
import { conversionPages, conversionSlug } from "./conversion-pages";
import { formats } from "./formats";
import { translatePathname } from "./routes";
import {
  availableTools,
  conversionCategory,
  toolCategories,
  toolFromSlug,
  toolIds,
  tools,
  toolsInCategory,
} from "./tools";

const messages = Object.fromEntries(
  await Promise.all(locales.map(async (l) => [l, (await import(`../../messages/${l}.json`)).default])),
);

describe("tool registry", () => {
  it("only publishes verified tools", () => {
    expect(availableTools).toEqual(toolIds.filter((id) => tools[id].status === "verified"));
  });

  it("describes every tool with known categories, formats and limits", () => {
    for (const id of toolIds) {
      const tool = tools[id];
      expect(tool.id).toBe(id);
      expect(toolCategories).toContain(tool.category);
      expect(tool.inputs.length).toBeGreaterThan(0);
      expect(tool.outputs.length).toBeGreaterThan(0);
      [...tool.inputs, ...tool.outputs].forEach((f) => expect(formats[f]).toBeDefined());
      expect(tool.libraries.length).toBeGreaterThan(0);
      expect(tool.limits.timeoutMs).toBeGreaterThan(0);
    }
  });

  it("has title, description and action in every language for published tools", () => {
    for (const locale of locales) {
      for (const id of availableTools) {
        const t = messages[locale].Tools[id];
        expect(t?.title, `${locale} ${id}`).toBeTruthy();
        expect(t?.description, `${locale} ${id}`).toBeTruthy();
        expect(t?.action, `${locale} ${id}`).toBeTruthy();
      }
    }
  });

  it("groups published tools by category", () => {
    expect(toolsInCategory("pdf").map((t) => t.id)).toContain("merge-pdf");
    expect(toolsInCategory("audio")).toEqual([]);
  });

  it("classifies conversion pages", () => {
    expect(conversionCategory({ from: "png", to: "webp" })).toBe("image");
    expect(conversionCategory({ from: "jpg", to: "pdf" })).toBe("pdf");
    expect(conversionCategory({ from: "pdf", to: "png" })).toBe("pdf");
    expect(conversionCategory({ from: "pdf", to: "docx" })).toBe("document");
    expect(conversionCategory({ from: "docx", to: "pdf" })).toBe("document");
  });
});

describe("tool slugs", () => {
  it("are unique within each locale and URL-safe", () => {
    for (const locale of locales) {
      const slugs = toolIds.map((id) => tools[id].slugs[locale]);
      expect(new Set(slugs).size).toBe(slugs.length);
      slugs.forEach((s) => expect(s).toMatch(/^[a-z0-9-]+$/));
    }
  });

  it("never collide with catalog, conversion or long-tail pages", () => {
    for (const locale of locales) {
      const all = [
        allToolsSlugs[locale],
        ...publishedCategories.map((c) => categorySlug(c, locale)),
        ...availableTools.map((id) => tools[id].slugs[locale]),
        ...conversionPages.map((c) => conversionSlug(c, locale)),
        ...longtailPages.filter((p) => p.locale === locale).map((p) => p.slug),
      ];
      const dupes = all.filter((s, i) => all.indexOf(s) !== i);
      expect(dupes, locale).toEqual([]);
    }
  });

  it("resolve back to their tool", () => {
    expect(toolFromSlug("es", "unir-pdf")?.id).toBe("merge-pdf");
    expect(toolFromSlug("fr", "fusionner-pdf")?.id).toBe("merge-pdf");
    expect(toolFromSlug("es", "merge-pdf")).toBeUndefined();
  });
});

describe("translatePathname", () => {
  it("translates tool slugs between locales", () => {
    expect(translatePathname("/unir-pdf", "es", "en")).toBe("/merge-pdf");
    expect(translatePathname("/merge-pdf", "en", "pt")).toBe("/juntar-pdf");
  });

  it("leaves other paths untouched", () => {
    expect(translatePathname("/", "es", "en")).toBe("/");
    expect(translatePathname("/something", "es", "en")).toBe("/something");
    expect(translatePathname("/a/b", "es", "en")).toBe("/a/b");
  });
});
