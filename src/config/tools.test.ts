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
  relatedTools,
  toolsForConversion,
  type ToolId,
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

  const generators = new Set<string>(["uuid-generator", "qr-generator", "password-generator"]);

  it("describes every tool with known categories, formats and limits", () => {
    for (const id of toolIds) {
      const tool = tools[id];
      expect(tool.id).toBe(id);
      expect(toolCategories).toContain(tool.category);
      // Generators (UUID, passwords...) take no input format.
      expect(tool.inputs.length > 0 || generators.has(id)).toBe(true);
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

  it("has an introduction and at least 3 numbered questions in every language for published tools", () => {
    for (const locale of locales) {
      for (const id of availableTools) {
        const t = messages[locale].Tools[id];
        // Chinese says the same in about a third of the characters.
        expect(t?.about?.length, `${locale} ${id} about`).toBeGreaterThan(locale === "zh" ? 40 : 120);
        const faq: Record<string, string> = t?.faq ?? {};
        const numbers = Object.keys(faq)
          .filter((k) => k.startsWith("q"))
          .map((k) => Number(k.slice(1)));
        expect(numbers.length, `${locale} ${id} faq`).toBeGreaterThanOrEqual(3);
        // Numbered from 1 without gaps (the page reads q1, q2... until one is missing).
        expect(numbers.sort((a, b) => a - b)).toEqual(numbers.map((_, i) => i + 1));
        for (const n of numbers) expect(faq[`a${n}`], `${locale} ${id} a${n}`).toBeTruthy();
      }
    }
  });

  it("gives every page its own introduction (no copies between tools)", () => {
    for (const locale of locales) {
      const intros = availableTools.map((id) => messages[locale].Tools[id].about);
      expect(new Set(intros).size).toBe(intros.length);
    }
  });

  it("links related tools from the same category first, never itself", () => {
    for (const id of availableTools) {
      const related = relatedTools(id);
      expect(related.map((t) => t.id)).not.toContain(id);
      expect(related.every((t) => t.status === "verified")).toBe(true);
      const firstOther = related.findIndex((t) => t.category !== tools[id].category);
      if (firstOther !== -1) expect(related.slice(firstOther).every((t) => t.category !== tools[id].category)).toBe(true);
    }
    expect(relatedTools("merge-pdf").map((t) => t.id)).toContain("split-pdf");
    expect(relatedTools("merge-pdf", 2)).toHaveLength(2);
  });

  it("every published tool is linked from at least one other tool's page", () => {
    const linked = new Set(availableTools.flatMap((id) => relatedTools(id).map((t) => t.id)));
    // Only a tool alone in its category that no other tool shares an input with or produces one for
    // stays out (its category page links it).
    const isolated = (id: ToolId) =>
      toolsInCategory(tools[id].category).length === 1 &&
      !availableTools.some((o) => o !== id && [...tools[o].inputs, ...tools[o].outputs].some((f) => tools[id].inputs.includes(f)));
    expect(availableTools.filter((id) => !linked.has(id) && !isolated(id))).toEqual([]);
  });

  it("links the next step in other categories: tools that take this tool's output", () => {
    const related = relatedTools("remove-background").map((t) => t.id);
    expect(related).toContain("id-photo");
    expect(related).toContain("images-to-pdf");
    expect(relatedTools("scan-document").map((t) => t.id)).toContain("ocr-pdf");
    // Explicit pairs link both ways: read aloud with PDF to text, OCR and EPUB.
    expect(relatedTools("text-to-speech").map((t) => t.id)).toEqual(expect.arrayContaining(["pdf-to-text", "image-to-text", "epub-converter"]));
    for (const id of ["pdf-to-text", "image-to-text", "epub-converter"] as const) expect(relatedTools(id).map((t) => t.id), id).toContain("text-to-speech");
    for (const id of availableTools) {
      if (toolsInCategory(tools[id].category).length > 1) expect(relatedTools(id).length, id).toBeGreaterThan(0);
    }
  });

  it("conversion pages link tools for their result first, then their input", () => {
    const heic = toolsForConversion({ from: "heic", to: "jpg" });
    expect(heic.length).toBe(4);
    expect(heic.every((t) => t.status === "verified" && t.inputs.includes("jpg"))).toBe(true);
    expect(toolsForConversion({ from: "docx", to: "pdf" }).every((t) => t.inputs.includes("pdf"))).toBe(true);
  });

  it("groups published tools by category", () => {
    expect(toolsInCategory("pdf").map((t) => t.id)).toContain("merge-pdf");
    expect(toolsInCategory("cad").map((t) => t.id)).toEqual(["dxf-converter"]);
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
