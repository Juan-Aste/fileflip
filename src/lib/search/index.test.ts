import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/routing";
import { conversionPages } from "@/config/conversion-pages";
import { availableTools } from "@/config/tools";
import { buildSearchIndex } from "./index";
import { searchEntries } from "./match";

describe("search index", () => {
  it("covers every published page with translated titles in each language", async () => {
    for (const locale of locales) {
      const messages = (await import(`../../../messages/${locale}.json`)).default;
      const index = buildSearchIndex(locale, messages);
      expect(index.filter((e) => e.kind === "tool")).toHaveLength(availableTools.length);
      expect(index.filter((e) => e.kind === "conversion")).toHaveLength(conversionPages.length);
      expect(new Set(index.map((e) => e.href)).size).toBe(index.length);
      for (const e of index) expect(e.title, `${locale} ${e.href}`).not.toMatch(/^(Catalog|Tools|ConversionPage)\./);
    }
  });

  it("finds tools by name and conversions by format", async () => {
    const messages = (await import("../../../messages/es.json")).default;
    const index = buildSearchIndex("es", messages);
    expect(searchEntries(index, "unir")[0].href).toBe("/unir-pdf");
    expect(searchEntries(index, "heic jpg")[0].href).toBe("/heic-a-jpg");
    expect(searchEntries(index, "imagenes")[0].href).toBe("/herramientas-de-imagen");
  });
});
