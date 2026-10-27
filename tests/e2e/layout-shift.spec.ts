// CLS: pages must not move when the web fonts arrive late (slow phones).
// The body font uses font-display: optional (src/app/fonts.ts); with "swap"
// the category pills re-wrapped and the PDF category scored ~0.08.
import { expect, test } from "./support";

test.use({ viewport: { width: 412, height: 823 } });

for (const path of ["/es", "/es/herramientas-pdf", "/en/pdf-tools", "/es/unir-pdf", "/es/creditos", "/es/leer-texto-en-voz-alta"]) {
  test(`no layout shift with late fonts: ${path}`, async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!e.hadRecentInput) w.__cls += e.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.route(/\.woff2$/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);
  });
}
