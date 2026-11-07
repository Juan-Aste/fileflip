import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/routing";
import { foreignSlugRedirect, isKnownPath, knownPages, unprefixedRedirect } from "./known-pages";
import { translatePathname } from "./routes";

function gscUrls(file: string): string[] {
  return readFileSync(`docs/seo/gsc-2026-11-07/${file}`, "utf8")
    .split("\n")
    .slice(1)
    .map((line) => line.split(",")[0].trim())
    .filter(Boolean)
    .map((url) => new URL(url).pathname);
}

function redirectFor(pathname: string): string | undefined {
  const [, first] = pathname.split("/");
  const locale = locales.find((l) => l === first);
  return locale ? foreignSlugRedirect(locale, pathname.slice(locale.length + 1)) : unprefixedRedirect(pathname);
}

describe("known pages", () => {
  it("sends every 404 and redirect reported by Search Console to an existing page", () => {
    const urls = [...gscUrls("404.csv"), ...gscUrls("redireccion.csv")];
    expect(urls.length).toBe(339 + 45);
    // Price suffixes ("/mes", "/mo"…) that Google took from the page's JSON: no
    // page, so they stay 404 (the strings no longer start with "/").
    const junk = ["/mes", "/mo", "/yr", "/ano", "/an", "/m%C3%AAs", "/mois", "/%E6%9C%88", "/%E5%B9%B4"];
    for (const path of junk) expect(redirectFor(path), path).toBeUndefined();
    const missing = urls.filter((path) => !junk.includes(path)).filter((path) => {
      const target = redirectFor(path);
      if (!target) return true;
      const [, l, ...rest] = target.split("/");
      const locale = locales.find((x) => x === l)!;
      if (["privacy", "terms", "contact"].includes(rest.join("/"))) return false;
      return rest.length > 0 && !isKnownPath(locale, `/${rest.join("/")}`);
    });
    expect(missing).toEqual([]);
  });

  it("keeps the slug's language when there is no prefix", () => {
    expect(unprefixedRedirect("/unir-pdf")).toBe("/es/unir-pdf");
    expect(unprefixedRedirect("/csv-to-pdf")).toBe("/en/csv-to-pdf");
    expect(unprefixedRedirect("/heic-en-ico")).toBe("/fr/heic-en-ico");
    expect(unprefixedRedirect("/no-such-page")).toBeUndefined();
  });

  it("translates foreign slugs under a prefix and leaves right or unknown ones", () => {
    expect(foreignSlugRedirect("es", "/jpg-to-pdf")).toBe("/es/jpg-a-pdf");
    expect(foreignSlugRedirect("zh", "/merge-pdf")).toBeUndefined();
    expect(foreignSlugRedirect("es", "/unir-pdf")).toBeUndefined();
    expect(foreignSlugRedirect("es", "/no-such-page")).toBeUndefined();
    expect(foreignSlugRedirect("en", "/unir-pdf/")).toBe("/en/merge-pdf");
  });

  it("matches the language switcher for every page and language pair", () => {
    for (const page of knownPages) {
      for (const from of locales) {
        const path = page[from];
        if (!path) continue;
        for (const to of locales) {
          const switched = translatePathname(path, from, to);
          if (page[to]) expect(switched, `${from}${path} → ${to}`).toBe(page[to]);
          else expect(switched === "/" || /^\/[^/]+$/.test(switched), `${from}${path} → ${to}`).toBe(true);
        }
      }
    }
  });
});
