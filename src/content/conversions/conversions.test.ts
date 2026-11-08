import { describe, expect, it } from "vitest";
import { conversions, formats, type FormatId } from "@/config/formats";
import { indexedConversionPairs } from "@/config/indexing";
import { limits } from "@/config/limits";
import { locales } from "@/i18n/routing";
import { conversionContentByLocale, conversionKey, type ConversionContent } from ".";

// Phase 19.2b: every indexed conversion page must carry text of its own, not
// only the template. Groups are added as their texts are written.
const isOffice = (from: FormatId, to: FormatId) =>
  (from === "pdf" && to === "docx") || (to === "pdf" && formats[from].category === "document");

const photoFormats: readonly FormatId[] = ["heic", "webp", "avif"];
const isPhotoOrPdfImage = (from: FormatId, to: FormatId) =>
  (photoFormats.includes(from) && (to === "jpg" || to === "png" || to === "pdf")) ||
  ((from === "jpg" || from === "png") && to === "pdf") ||
  (from === "pdf" && (to === "jpg" || to === "png"));

const required = indexedConversionPairs.filter(([from, to]) => isOffice(from, to) || isPhotoOrPdfImage(from, to));
const indexedKeys = new Set(indexedConversionPairs.map(([from, to]) => conversionKey({ from, to })));

const allText = (c: ConversionContent) => [
  ...c.when,
  ...c.differences,
  ...c.kept,
  ...c.lost,
  ...c.limits,
  ...c.steps,
  ...c.faq.flatMap(({ q, a }) => [q, a]),
];

const words = (c: ConversionContent) => allText(c).join(" ").split(/\s+/).filter(Boolean).length;
const cjkChars = (c: ConversionContent) => (allText(c).join("").match(/[一-鿿]/g) ?? []).length;

describe("conversion page content", () => {
  it("covers the office (10) and photo/image ↔ PDF (11) groups", () => {
    expect(required).toHaveLength(21);
  });

  for (const [from, to] of required) {
    const key = conversionKey({ from, to });
    describe(key, () => {
      for (const locale of locales) {
        it(`has complete text in ${locale}`, () => {
          const c = conversionContentByLocale[locale][key];
          expect(c, `${locale} ${key}`).toBeDefined();
          if (!c) return;
          expect(c.when.length).toBeGreaterThan(0);
          expect(c.differences.length).toBeGreaterThan(0);
          expect(c.kept.length).toBeGreaterThan(1);
          expect(c.lost.length).toBeGreaterThan(0);
          expect(c.limits.length).toBeGreaterThan(0);
          expect(c.steps.length).toBeGreaterThanOrEqual(3);
          expect(c.steps.length).toBeLessThanOrEqual(4);
          expect(c.faq.length).toBeGreaterThanOrEqual(3);
          for (const s of allText(c)) expect(s.trim().length, s).toBeGreaterThan(locale === "zh" ? 2 : 5);
          // Enough to be a page of its own, not a template with two lines.
          if (locale === "zh") expect(cjkChars(c)).toBeGreaterThan(300);
          else expect(words(c)).toBeGreaterThan(200);
        });
      }

      it("has the same shape in every language as in Spanish", () => {
        const es = conversionContentByLocale.es[key]!;
        for (const locale of locales) {
          const c = conversionContentByLocale[locale][key]!;
          for (const field of ["when", "differences", "kept", "lost", "limits", "steps", "faq"] as const) {
            expect(c[field].length, `${locale} ${key} ${field}`).toBe(es[field].length);
          }
        }
      });
    });
  }

  it("only indexed conversions get text (noindex pages stay out of the effort)", () => {
    for (const locale of locales) {
      for (const key of Object.keys(conversionContentByLocale[locale])) expect(indexedKeys.has(key as never), key).toBe(true);
    }
  });

  it("does not repeat paragraphs between conversions", () => {
    for (const locale of locales) {
      const seen = new Map<string, string>();
      for (const [key, c] of Object.entries(conversionContentByLocale[locale])) {
        for (const p of [...c!.when, ...c!.differences]) {
          expect(seen.get(p), `${locale}: "${p}" in ${key} and ${seen.get(p)}`).toBeUndefined();
          seen.set(p, key);
        }
      }
    }
  });

  it("zh text has no Spanish, Portuguese or French words left over", () => {
    const leftovers = /\b(el|la|los|las|de|que|para|une|des|não|você|archivo|fichier|arquivo)\b/i;
    for (const c of Object.values(conversionContentByLocale.zh)) {
      for (const s of allText(c!)) expect(s, s).not.toMatch(leftovers);
    }
  });

  it("quotes the real size limit of the free plan", () => {
    const mb = limits.free.serverMaxFileBytes / (1024 * 1024);
    for (const locale of locales) {
      for (const [key, c] of Object.entries(conversionContentByLocale[locale])) {
        // Browser conversions have no plan limit (their MB figures are other facts).
        if (conversions.find((v) => conversionKey(v) === key)?.engine !== "server") continue;
        for (const s of c!.limits) {
          for (const m of s.matchAll(/(\d+)\s?(?:MB|Mo)/g)) expect(Number(m[1]), `${locale} ${key}`).toBe(mb);
        }
      }
    }
  });
});
