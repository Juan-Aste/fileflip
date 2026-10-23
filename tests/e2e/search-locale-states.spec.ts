// The search dialog and the language selector when the network is slow,
// failing or gone (6C.3 in PLAN.md): a visible status, no uncaught errors,
// and they work again once the network is back.
import type { Route } from "@playwright/test";
import { expect, test } from "./support";

const status = "dialog [role=status]";

test.describe("search", () => {
  for (const [name, fail] of [
    ["HTTP 500", (route: Route) => route.fulfill({ status: 500, body: "boom" })],
    ["network error", (route: Route) => route.abort("failed")],
  ] as const) {
    test(`index ${name} → says so; reopening retries`, async ({ page }) => {
      let failing = true;
      await page.route("**/api/search-index/**", (route) => (failing ? fail(route) : route.fallback()));
      await page.goto("/es", { waitUntil: "networkidle" });
      await page.keyboard.press("Control+k");
      const box = page.getByRole("combobox", { name: "Buscar herramientas" });
      await box.fill("unir");
      await expect(page.locator(status)).toContainText("No se pudo cargar el buscador");
      failing = false;
      await page.keyboard.press("Escape");
      await page.keyboard.press("Control+k");
      await box.fill("unir");
      await expect(page.getByRole("listbox", { name: "Buscar herramientas" }).getByRole("option").first()).toBeVisible();
    });
  }

  test("slow index → loading status, then results", async ({ page }) => {
    await page.route("**/api/search-index/**", async (route) => {
      await new Promise((r) => setTimeout(r, 1_500));
      await route.fallback();
    });
    await page.goto("/es", { waitUntil: "networkidle" });
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox", { name: "Buscar herramientas" }).fill("unir");
    await expect(page.locator(status)).toContainText("Cargando");
    await expect(page.locator(status)).toContainText("resultado");
  });
});

test.describe("language selector", () => {
  test("offline: no uncaught error, the selector stays usable, and it switches once online", async ({ page, context }) => {
    await page.goto("/es/unir-pdf", { waitUntil: "networkidle" });
    const select = page.getByRole("combobox", { name: /idioma/i }).first();
    await context.setOffline(true);
    await select.selectOption("en").catch(() => undefined);
    // Offline the switch can't happen; the page must not break or freeze the control.
    await page.waitForTimeout(1_000);
    await context.setOffline(false);
    if (!page.url().includes("/en/")) {
      await expect(select).toBeEnabled();
      await select.selectOption("en");
    }
    await page.waitForURL("**/en/merge-pdf");
  });
});

test("language selector after a deploy replaced the page's files: loads the new language's home", async ({ page }) => {
  await page.goto("/es/unir-pdf", { waitUntil: "networkidle" });
  // The old build's lazy chunks are gone (404) once a new version is live.
  await page.route("**/_next/static/chunks/**", (route) => route.fulfill({ status: 404, body: "" }));
  await page.getByRole("combobox", { name: /idioma/i }).first().selectOption("en");
  await page.waitForURL(/\/en$/);
});
