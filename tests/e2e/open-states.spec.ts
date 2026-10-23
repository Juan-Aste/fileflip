// Phase 6A: the click-reachability check (hit-test.ts) on states a page load
// does not show: the mobile menu, the Ctrl+K search dialog, the language
// switcher, open accordions and option panels, and tool results after a
// conversion (download links, previews, "start over").
import type { Page } from "@playwright/test";
import { hitTestPage } from "./hit-test";
import { expect, fileOf, openWithFiles, runTool, test, waitForResult } from "./support";

const sizes = [
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "desktop", width: 1280, height: 800, touch: false },
] as const;

const lines = (issues: Awaited<ReturnType<typeof hitTestPage>>) => issues.map((i) => `${i.kind}: ${i.target} (${i.detail})`);

async function expectReachable(page: Page, touch: boolean, root?: string) {
  expect(lines(await hitTestPage(page, { touch, root })), root ?? page.url()).toEqual([]);
}

for (const size of sizes) {
  for (const scheme of ["light", "dark"] as const) {
    test.describe(`${size.name} ${scheme}`, () => {
      test.use({ viewport: { width: size.width, height: size.height }, colorScheme: scheme, hasTouch: size.touch });

      test("search dialog with results", async ({ page }) => {
        await page.goto("/es/unir-pdf", { waitUntil: "networkidle" });
        if (size.touch) await page.locator("header").getByRole("button", { name: /buscar/i }).first().click();
        else await page.keyboard.press("Control+k");
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await dialog.getByRole("combobox").fill("pdf");
        await expect(dialog.getByRole("option").first()).toBeVisible();
        await expectReachable(page, size.touch, "dialog[open]");
        // A result is clickable for real and navigates.
        await dialog.getByRole("option").first().click();
        await expect(dialog).toBeHidden();
      });

      test("FAQ and option panels open", async ({ page }) => {
        await page.goto("/es/comprimir-imagen", { waitUntil: "networkidle" });
        await page.locator("details").evaluateAll((all) => all.forEach((d) => ((d as HTMLDetailsElement).open = true)));
        await expectReachable(page, size.touch);
      });

      test("home converter result", async ({ page }) => {
        await openWithFiles(page, "/es", ["image.png"]);
        await page.locator('input[name="target"][value="jpg"]').check({ force: true });
        await page.locator("details").evaluateAll((all) => all.forEach((d) => ((d as HTMLDetailsElement).open = true)));
        await expectReachable(page, size.touch);
        await page.getByRole("button", { name: "Convertir", exact: true }).click();
        fileOf(await waitForResult(page, page.locator("main a[download]").first(), page.locator("main [role=alert]").first()));
        await expectReachable(page, size.touch);
      });

      test("PDF, image and archive tool results", async ({ page }) => {
        test.setTimeout(120_000);
        await openWithFiles(page, "/es/unir-pdf", ["document.pdf", "document-1page.pdf"]);
        await expectReachable(page, size.touch);
        fileOf(await runTool(page, "Unir PDF"));
        await expectReachable(page, size.touch);

        await openWithFiles(page, "/es/comprimir-imagen", ["image.jpg", "image.png"]);
        fileOf(await runTool(page, "Comprimir imágenes"));
        await expectReachable(page, size.touch);

        // Extracting lists every entry with its own download link.
        await openWithFiles(page, "/es/extraer-zip", ["archive.zip"]);
        await page.getByRole("button", { name: /extraer/i }).first().click();
        await page.locator("main a[download]").first().waitFor();
        await expectReachable(page, size.touch);
      });
    });
  }
}

test.describe("phone menu and language", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  for (const scheme of ["light", "dark"] as const) {
    test(`mobile menu open (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/es/convertir-imagen", { waitUntil: "networkidle" });
      const button = page.locator("header button[aria-controls]");
      await expect(button).toHaveAccessibleName("Abrir menú");
      await button.click();
      await expect(button).toHaveAccessibleName("Cerrar menú");
      const panel = `[id="${await button.getAttribute("aria-controls")}"]`;
      await expect(page.locator(panel)).toBeVisible();
      await expectReachable(page, true, panel);
      // The close button stays reachable above the open panel.
      await expectReachable(page, true, "header");
      // Following a link closes the menu and navigates.
      await page.locator(panel).getByRole("link").first().click();
      await expect(page.locator(panel)).toBeHidden();
    });
  }

  test("language switcher keeps the page and stays usable", async ({ page }) => {
    await page.goto("/es/unir-pdf", { waitUntil: "networkidle" });
    // On phones the switcher lives in the menu.
    await page.locator("header button[aria-controls]").click();
    const select = page.locator("header select:visible");
    await expectReachable(page, true, "header");
    await select.selectOption("pt");
    await expect(page).toHaveURL(/\/pt\/juntar-pdf$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt");
    await expectReachable(page, true);
  });
});
