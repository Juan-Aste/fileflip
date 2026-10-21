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
