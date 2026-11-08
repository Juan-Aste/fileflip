// Phase 19.2b: indexed conversion pages carry text of their own (when to
// convert, differences, what is kept and lost, limits, steps, FAQ with
// FAQPage data), in every language, accessible and without overflow.
import { conversionSlug } from "../../src/config/conversion-pages";
import { conversionContentByLocale } from "../../src/content/conversions";
import type { FormatId } from "../../src/config/formats";
import { locales } from "../../src/i18n/routing";
import { axeViolations } from "./axe";
import { expect, test } from "./support";

const pages = locales.flatMap((locale) =>
  Object.keys(conversionContentByLocale[locale]).map((key) => {
    const [from, to] = key.split(">") as [FormatId, FormatId];
    return { locale, key, path: `/${locale}/${conversionSlug({ from, to }, locale)}` };
  }),
);

test.describe("conversion pages with own content", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const locale of locales) {
    test(`all pages in ${locale}${locale === "es" ? " @xb" : ""}`, async ({ page }) => {
      test.setTimeout(180_000);
      for (const { key, path } of pages.filter((p) => p.locale === locale)) {
        const c = conversionContentByLocale[locale][key as keyof (typeof conversionContentByLocale)[typeof locale]]!;
        const response = await page.goto(path, { waitUntil: "networkidle" });
        expect(response?.status(), path).toBe(200);
        await expect(page.locator('meta[name="robots"][content*="noindex"]'), path).toHaveCount(0);
        for (const id of ["when", "how", "differences", "kept", "lost", "limits", "faq"]) {
          await expect(page.locator(`h2#${id}`), `${path} #${id}`).toBeVisible();
        }
        await expect(page.getByText(c.when[0], { exact: true })).toBeVisible();
        await expect(page.locator("ol li").filter({ hasText: c.steps[0] })).toHaveCount(1);
        const faq = await page
          .locator('script[type="application/ld+json"]')
          .evaluateAll((els) => els.map((e) => JSON.parse(e.textContent ?? "{}")).find((d) => d["@type"] === "FAQPage"));
        expect(faq?.mainEntity?.length, path).toBe(c.faq.length);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, path).toBeLessThanOrEqual(0);
      }
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    test(`axe, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of ["/es/pdf-a-word", "/en/excel-to-pdf", "/zh/powerpoint-to-pdf"]) {
        await page.goto(path, { waitUntil: "networkidle" });
        await page.locator("details").first().locator("summary").click();
        expect(await axeViolations(page), `${path} ${scheme}`).toEqual([]);
      }
    });
  }
});
