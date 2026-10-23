// Phase 6: a file picked before the page's JavaScript has loaded (a slow
// phone, or a fast user) must not be lost. Found when WebKit in CI picked the
// fixture before hydration and the tool silently ignored it (B-05).
import { expect, fixturePath, test } from "./support";

test("a file picked before hydration is taken once the page loads", { tag: "@xb" }, async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  // Hold the JavaScript chunks so the server-rendered page stays inert.
  await page.route("**/_next/static/chunks/**", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/es/extraer-zip", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="file"]').first().setInputFiles(fixturePath("archive.zip"));
  release();
  await page.getByRole("button", { name: "Extraer archivos", exact: true }).click({ timeout: 20_000 });
  await expect(page.locator("main li a[download]")).toHaveCount(5, { timeout: 30_000 });
});
