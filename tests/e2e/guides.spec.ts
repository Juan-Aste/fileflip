// Guides: index and articles render with their table of contents, breadcrumbs,
// structured data and screenshots in every language they are published in;
// every link works; the language switcher keeps the guide; axe in light and dark.
import { readFileSync } from "node:fs";
import { guideLocales, guidePath, guides, guidesFor, guidesSlugs } from "../../src/content/guides/meta";
import { locales, type Locale } from "../../src/i18n/routing";
import { axeViolations } from "./axe";
import { expect, test } from "./support";

type Labels = Record<string, string>;
const labels = (l: Locale) => JSON.parse(readFileSync(`messages/${l}.json`, "utf8")) as { Guides: Labels; Footer: Labels; LocaleSwitcher: Labels };
const articlePath = (id: string, l: Locale) => `/${l}${guidePath(guides.find((g) => g.id === id)!, l)}`;

for (const l of guideLocales) {
  const m = labels(l);
  const list = guidesFor(l);

  test(`${l}: the index lists every guide and the footer links to it`, async ({ page }) => {
    await page.goto(`/${l}`, { waitUntil: "networkidle" });
    await page.locator("footer").getByRole("link", { name: m.Footer.guides }).click();
    await expect(page).toHaveURL(new RegExp(`/${l}/${guidesSlugs[l]}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(m.Guides.indexTitle);
    const hrefs = await page.locator("main ul a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs).toEqual(list.map((g) => articlePath(g.id, l)));
  });

  for (const guide of list) {
    test(`${l}: guide ${guide.id}: contents, structured data, images and links${guide === list[0] ? " @xb" : ""}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto(articlePath(guide.id, l), { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(guide.versions[l]!.title);
      await expect(page.getByText(m.Guides.byline.replace("{author}", m.Guides.author))).toBeVisible();

      // Breadcrumbs back to the index.
      await expect(page.getByRole("navigation", { name: m.Guides.breadcrumb }).getByRole("link", { name: m.Guides.indexTitle })).toHaveAttribute("href", `/${l}/${guidesSlugs[l]}`);

      // Every table-of-contents entry points to a heading of the article.
      const toc = page.getByRole("navigation", { name: m.Guides.contents }).getByRole("link");
      expect(await toc.count()).toBeGreaterThanOrEqual(3);
      for (const href of await toc.evaluateAll((links) => links.map((a) => a.getAttribute("href")!))) {
        await expect(page.locator(`h2${href}`)).toHaveCount(1);
      }

      const types = await page.locator('script[type="application/ld+json"]').evaluateAll((s) => s.map((el) => JSON.parse(el.textContent!)["@type"]));
      expect(types).toEqual(expect.arrayContaining(["Article", "BreadcrumbList", ...(guide.howTo ? ["HowTo"] : [])]));

      // Screenshots load, with their size reserved, taken in this language.
      const images = page.locator(".guide-body img");
      expect(await images.count()).toBeGreaterThan(0);
      for (const img of await images.all()) {
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveAttribute("width", /\d+/);
        if (l !== "es") await expect(img).toHaveAttribute("src", new RegExp(`\\.${l}\\.webp$`));
        await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
      }

      // Every internal link of the article works.
      const hrefs = await page.locator("main a[href^='/']").evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute("href")!))]);
      for (const href of hrefs) expect((await page.request.get(href)).status(), href).toBe(200);
    });
  }
}

test("languages without guides have no index", async ({ request }) => {
  for (const l of locales.filter((l) => !guideLocales.includes(l))) {
    expect((await request.get(`/${l}/${guidesSlugs[l]}`)).status()).toBe(404);
  }
});

test("the language switcher keeps the guide, or goes home where it is not translated", async ({ page }) => {
  const guide = guidesFor("es")[0];
  await page.goto(articlePath(guide.id, "es"), { waitUntil: "networkidle" });
  for (const l of locales.filter((l) => l !== "es")) {
    await page.goto(articlePath(guide.id, "es"), { waitUntil: "networkidle" });
    await page.getByRole("combobox", { name: labels("es").LocaleSwitcher.label }).first().selectOption(l);
    await expect(page).toHaveURL(guide.versions[l] ? new RegExp(`${articlePath(guide.id, l)}$`) : new RegExp(`/${l}$`));
  }
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`axe on the indexes and the guides (${colorScheme})`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.emulateMedia({ colorScheme });
    for (const l of guideLocales) {
      for (const path of [`/${l}/${guidesSlugs[l]}`, ...guidesFor(l).map((g) => articlePath(g.id, l))]) {
        await page.goto(path, { waitUntil: "networkidle" });
        expect(await axeViolations(page), path).toEqual([]);
      }
    }
  });
}
