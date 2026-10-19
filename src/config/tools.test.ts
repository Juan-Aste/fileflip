import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/routing";
import { translatePathname } from "./routes";
import { toolFromSlug, toolIds, tools } from "./tools";

describe("tool slugs", () => {
  it("are unique within each locale and URL-safe", () => {
    for (const locale of locales) {
      const slugs = toolIds.map((id) => tools[id].slugs[locale]);
      expect(new Set(slugs).size).toBe(slugs.length);
      slugs.forEach((s) => expect(s).toMatch(/^[a-z0-9-]+$/));
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
