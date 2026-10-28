// Guides: index and articles render with their table of contents, breadcrumbs,
// structured data and screenshots; every link works; axe in light and dark.
import { guidePath, guides, guidesFor, guidesSlugs } from "../../src/content/guides/meta";
import { axeViolations } from "./axe";
import { expect, test } from "./support";

const spanish = guidesFor("es");
const articlePath = (id: string) => `/es${guidePath(guides.find((g) => g.id === id)!, "es")}`;

test("the index lists every guide and the footer links to it", async ({ page }) => {
  await page.goto("/es", { waitUntil: "networkidle" });
  await page.locator("footer").getByRole("link", { name: "Guías" }).click();
  await expect(page).toHaveURL(new RegExp(`/es/${guidesSlugs.es}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Guías");
  for (const guide of spanish) {
    await expect(page.getByRole("link", { name: new RegExp(guide.versions.es!.title.slice(0, 30).replace(/[()]/g, ".")) })).toHaveAttribute("href", articlePath(guide.id));
  }
  // Languages without guides have no index.
  expect((await page.request.get(`/en/${guidesSlugs.en}`)).status()).toBe(404);
});

for (const guide of spanish) {
  test(`guide ${guide.id}: contents, structured data, images and links${guide === spanish[0] ? " @xb" : ""}`, async ({ page }) => {
    test.setTimeout(90_000);
    const path = articlePath(guide.id);
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(guide.versions.es!.title);
    await expect(page.getByText("Por Equipo de Fileflect")).toBeVisible();

    // Breadcrumbs back to the index.
    await expect(page.getByRole("navigation", { name: "Ruta de navegación" }).getByRole("link", { name: "Guías" })).toHaveAttribute("href", `/es/${guidesSlugs.es}`);

    // Every table-of-contents entry points to a heading of the article.
    const toc = page.getByRole("navigation", { name: "En esta guía" }).getByRole("link");
    expect(await toc.count()).toBeGreaterThanOrEqual(3);
    for (const href of await toc.evaluateAll((links) => links.map((a) => a.getAttribute("href")!))) {
      await expect(page.locator(`h2${href}`)).toHaveCount(1);
    }

    const types = await page.locator('script[type="application/ld+json"]').evaluateAll((s) => s.map((el) => JSON.parse(el.textContent!)["@type"]));
    expect(types).toEqual(expect.arrayContaining(["Article", "BreadcrumbList", ...(guide.howTo ? ["HowTo"] : [])]));

    // Screenshots load, with their size reserved.
    const images = page.locator(".guide-body img");
    expect(await images.count()).toBeGreaterThan(0);
    for (const img of await images.all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute("width", /\d+/);
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
    }

    // Every internal link of the article works.
    const hrefs = await page.locator("main a[href^='/']").evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute("href")!))]);
    for (const href of hrefs) expect((await page.request.get(href)).status(), href).toBe(200);
  });
}

test("a guide in another language goes to that language's home while it is not translated", async ({ page }) => {
  await page.goto(articlePath(spanish[0].id), { waitUntil: "networkidle" });
  await page.getByRole("combobox", { name: "Idioma" }).first().selectOption("en");
  await expect(page).toHaveURL(/\/en$/);
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`axe on the index and the guides (${colorScheme})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme });
    for (const path of [`/es/${guidesSlugs.es}`, ...spanish.map((g) => articlePath(g.id))]) {
      await page.goto(path, { waitUntil: "networkidle" });
      expect(await axeViolations(page), path).toEqual([]);
    }
  });
}
