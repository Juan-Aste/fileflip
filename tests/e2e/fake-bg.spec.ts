// "Fake transparency": a logo saved as a medium-quality JPEG over the
// grey/white checkerboard editors draw behind transparent pixels. The
// converter and "Remove background" must notice it and turn it into real
// transparency; the download is read back with sharp and compared with the
// known logo (tests/helpers/fake-checker.ts), never with the app's code.
import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { checkerJpeg, distanceToEdge, logoMasks, rgbaOf, type CheckerFixture } from "../helpers/fake-checker";
import { axeViolations } from "./axe";
import { expect, fixturePath, test, waitForResult } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "the fake-background fix must not call the server").toEqual([]);
});

const LOGO: CheckerFixture = { width: 360, height: 240, cell: 12, ox: 4, oy: 7 };

/** Alpha 0 everywhere outside the logo and 255 inside it (away from the soft edge). */
async function expectRealTransparency(buf: Buffer, f: CheckerFixture, format: string) {
  const { default: sharp } = await import("sharp");
  const meta = await sharp(buf).metadata();
  expect(meta.format).toBe(format);
  expect(meta.hasAlpha).toBe(true);
  const out = await rgbaOf(buf);
  expect([out.width, out.height]).toEqual([f.width, f.height]);
  const { logo } = logoMasks(f.width, f.height);
  const dist = distanceToEdge(logo, f.width, f.height, 4);
  let bg = 0, clear = 0, fg = 0, opaque = 0;
  for (let p = 0; p < logo.length; p++) {
    if (dist[p]! < 3) continue;
    // Lossy WEBP/AVIF alpha is near, not exactly, 0/255.
    const a = out.data[p * 4 + 3]!;
    if (logo[p]) {
      fg++;
      if (a >= 250) opaque++;
    } else {
      bg++;
      if (a <= 5) clear++;
    }
  }
  expect(clear / bg).toBeGreaterThan(0.999);
  expect(opaque / fg).toBeGreaterThan(0.999);
}

async function addToConverter(page: Page, name: string, buffer: Buffer): Promise<Locator> {
  await page.goto("/es", { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles({ name, mimeType: "image/jpeg", buffer });
  const row = page.getByRole("region", { name: "Archivos seleccionados" }).locator("li").first();
  // The check runs in a worker after format detection.
  await expect(row).toHaveAttribute("data-fake", /none|found/, { timeout: 20_000 });
  return row;
}

test.describe("fake transparency", () => {
  test("@xb converter: notice, JPG has no alpha, fix → PNG with real transparency", async ({ page }) => {
    const row = await addToConverter(page, "logo-damero.jpg", await checkerJpeg(LOGO, 60));
    await expect(row).toHaveAttribute("data-fake", "found");
    const notice = row.getByTestId("fake-bg-notice");
    await expect(notice).toContainText("Esta imagen tiene un fondo transparente falso (está dibujado)");
    // Converting to JPG cannot keep transparency: the notice says so and the fix gives a PNG.
    await page.locator('input[name="target"][value="jpg"]').check({ force: true });
    await expect(notice).toContainText("JPG no admite transparencia");
    expect(await axeViolations(page)).toEqual([]);
    await notice.getByRole("button", { name: "Quitar fondo falso" }).click();
    const result = await waitForResult(page, row.locator("a[download]"), row.locator(".text-danger"), 60_000);
    if (result.error !== undefined) throw new Error(result.error);
    expect(result.name).toBe("logo-damero.png");
    await expectRealTransparency(result.buf, LOGO, "png");
    await expect(row.getByTestId("fake-bg-notice")).toHaveCount(0);
  });

  test("converter: with WEBP picked the fix keeps WEBP", async ({ page }) => {
    const f: CheckerFixture = { width: 300, height: 220, cell: 20 };
    const row = await addToConverter(page, "logo.jpg", await checkerJpeg(f, 70));
    await expect(row).toHaveAttribute("data-fake", "found");
    await page.locator('input[name="target"][value="webp"]').check({ force: true });
    await expect(row.getByTestId("fake-bg-notice")).not.toContainText("no admite transparencia");
    await row.getByRole("button", { name: "Quitar fondo falso" }).click();
    const result = await waitForResult(page, row.locator("a[download]"), row.locator(".text-danger"), 60_000);
    if (result.error !== undefined) throw new Error(result.error);
    expect(result.name).toBe("logo.webp");
    await expectRealTransparency(result.buf, f, "webp");
  });

  test("converter: a normal photo and a logo on plain white get no notice", async ({ page }) => {
    await page.goto("/es", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles([
      { name: "photo.jpg", mimeType: "image/jpeg", buffer: readFileSync(fixturePath("photo.jpg")) },
      { name: "logo-blanco.jpg", mimeType: "image/jpeg", buffer: await checkerJpeg({ width: 300, height: 220, cell: 16, plain: [255, 255, 255], innerChecker: true }) },
    ]);
    const rows = page.getByRole("region", { name: "Archivos seleccionados" }).locator("li");
    await expect(rows).toHaveCount(2);
    for (const row of await rows.all()) await expect(row).toHaveAttribute("data-fake", "none", { timeout: 20_000 });
    await expect(page.getByTestId("fake-bg-notice")).toHaveCount(0);
  });

  test("@xb remove background: notice and fix → PNG with real transparency", async ({ page }) => {
    await page.goto("/es/quitar-fondo", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles({ name: "logo.jpg", mimeType: "image/jpeg", buffer: await checkerJpeg(LOGO, 60) });
    const root = page.locator("[data-fake]");
    await expect(root).toHaveAttribute("data-fake", "found", { timeout: 20_000 });
    const notice = page.getByTestId("fake-bg-notice");
    await expect(notice).toContainText("fondo transparente falso");
    expect(await axeViolations(page)).toEqual([]);
    await notice.getByRole("button", { name: "Quitar fondo falso" }).click();
    const result = await waitForResult(page, page.getByTestId("fake-bg-download"), page.locator("[data-fake=error]"), 60_000);
    if (result.error !== undefined) throw new Error(result.error);
    expect(result.name).toBe("logo-sin-fondo.png");
    await expectRealTransparency(result.buf, LOGO, "png");
  });
});
