// Catalog search: shortcuts, keyboard navigation and lazy index, on desktop and phone.
import { expect, test } from "./support";

for (const [width, colorScheme] of [
  [1280, "light"],
  [360, "dark"],
] as const) {
  test.describe(`search at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 }, colorScheme });

    test("loads the index only on use and navigates with the keyboard", async ({ page }) => {
      const requests: string[] = [];
      page.on("request", (r) => requests.push(r.url()));
      await page.goto("/es", { waitUntil: "networkidle" });
      expect(requests.some((u) => u.includes("search-index"))).toBe(false);

      await page.keyboard.press("Control+k");
      const box = page.getByRole("combobox", { name: "Buscar herramientas" });
      await box.fill("heic jpg");
      await page.getByRole("listbox", { name: "Buscar herramientas" }).getByRole("option").first().waitFor();
      await expect(page.locator("dialog [role=status]")).toContainText("resultado");
      await page.keyboard.press("Enter");
      await page.waitForURL("**/es/heic-a-jpg");

      await page.keyboard.press("/");
      await box.fill("zzzz");
      await expect(page.locator("dialog [role=status]")).toContainText("No encontramos");
      await page.keyboard.press("Escape");
      await expect(box).toBeHidden();

      await page.getByRole("button", { name: "Buscar herramientas" }).click();
      await box.fill("unir");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("Enter");
      await page.waitForURL("**/es/unir-pdf");
    });
  });
}

test.describe("home catalog", () => {
  for (const width of [360, 1280]) {
    test(`at ${width}px: search field, popular tools and every category, without horizontal scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/es", { waitUntil: "networkidle" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

      const popular = page.getByRole("region", { name: "Herramientas populares" }).getByRole("link");
      expect(await popular.count()).toBeGreaterThanOrEqual(8);
      await expect(popular.filter({ hasText: "Quitar fondo de imagen" })).toHaveAttribute("href", "/es/quitar-fondo");
      const categories = page.getByRole("region", { name: "Explora por categoría" });
      await expect(categories.getByRole("link", { name: /^Audio\s*\d+ herramientas$/ })).toHaveAttribute("href", "/es/herramientas-de-audio");
      // One card per published category, as on "all tools", plus the link to it.
      await page.goto("/es/herramientas", { waitUntil: "networkidle" });
      const published = await page.getByRole("navigation", { name: "Categorías" }).getByRole("link").count();
      await page.goto("/es", { waitUntil: "networkidle" });
      expect(await categories.getByRole("link").count()).toBe(published);

      // The hero field opens the same dialog as the header button.
      await page.getByRole("button", { name: /^Buscar entre \d+ herramientas$/ }).click();
      const box = page.getByRole("combobox", { name: "Buscar herramientas" });
      await box.fill("quitar fondo");
      await page.keyboard.press("Enter");
      await page.waitForURL("**/es/quitar-fondo");
    });
  }
});

test("related links: a conversion page links tools for its result, a tool links the next step", async ({ page, request }) => {
  await page.goto("/es/heic-a-jpg", { waitUntil: "networkidle" });
  const tools = page.getByRole("navigation", { name: "Más herramientas para tus archivos HEIC y JPG" }).getByRole("link");
  await expect(tools).toHaveCount(4);
  for (const href of await tools.evaluateAll((links) => links.map((a) => a.getAttribute("href")!))) {
    expect((await request.get(href)).status(), href).toBe(200);
  }
  await page.goto("/es/quitar-fondo", { waitUntil: "networkidle" });
  const related = page.getByRole("navigation", { name: "Herramientas relacionadas" });
  await expect(related.getByRole("link", { name: "Foto carnet" })).toHaveAttribute("href", "/es/foto-carnet");
  await expect(related.getByRole("link", { name: "Imágenes a PDF" })).toBeVisible();
});
