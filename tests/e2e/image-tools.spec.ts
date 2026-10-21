// Image tools: outputs are decoded in the test with sharp (format, size,
// pixels, alpha), independently of the app's codecs.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import sharp from "sharp";
import { expect, fileOf, fixturePath, inspectImage, runTool, test, toolAlert, waitForResult } from "./support";

const choose = (page: Page, label: string) => page.locator("label").filter({ hasText: new RegExp(`^${label}$`) }).first().click();
const pick = (page: Page, files: string[]) => page.locator('input[type="file"]').setInputFiles(files);
const photo = readFileSync(fixturePath("photo.jpg"));
const alphaPng = readFileSync(fixturePath("photo-alpha.png"));
const visible = (px: Buffer) => {
  const out = Buffer.from(px);
  for (let i = 0; i < out.length; i += 4) if (out[i + 3] === 0) out.fill(0, i, i + 3);
  return out;
};
const rawPixels = async (buf: Buffer) => (await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "image tools must not call the server").toEqual([]);
});

test.describe("tool: compress-image", () => {
  test("JPG at the recommended level: much smaller, same size in pixels", async ({ page }) => {
    await page.goto("/es/comprimir-imagen", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg")]);
    const out = fileOf(await runTool(page, "Comprimir imágenes"));
    expect(out.name).toBe("photo.jpg");
    const info = await inspectImage(out.buf);
    expect(info).toMatchObject({ format: "jpg", width: 1000, height: 750 });
    expect(out.buf.length).toBeLessThan(photo.length * 0.5);
    await expect(page.getByText(/photo\.jpg: .* → .* menos\)/)).toBeVisible();
    await expect(page.locator("main img[alt='photo.jpg']")).toBeVisible();
  });

  test("exact size: a 50 KB preset fits and keeps the best quality under it", async ({ page }) => {
    await page.goto("/en/compress-image", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg")]);
    await choose(page, "Exact file size");
    await choose(page, "50 KB");
    const out = fileOf(await runTool(page, "Compress images"));
    expect(out.buf.length).toBeLessThanOrEqual(50_000);
    // Not crushed far below the target either.
    expect(out.buf.length).toBeGreaterThan(30_000);
    expect(await inspectImage(out.buf)).toMatchObject({ format: "jpg", width: 1000, height: 750 });
  });

  test("exact size below what quality alone reaches: the image is scaled down", async ({ page }) => {
    await page.goto("/en/compress-image", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("noise.jpg")]);
    await choose(page, "Exact file size");
    await choose(page, "Other");
    const custom = page.getByRole("textbox", { name: "Maximum size in KB" });
    await custom.fill("5");
    await expect(page.getByText("Enter a size of at least 10 KB.")).toBeVisible();
    await custom.fill("12");
    const out = fileOf(await runTool(page, "Compress images"));
    expect(out.buf.length).toBeLessThanOrEqual(12_000);
    const info = await inspectImage(out.buf);
    expect(info.width).toBeLessThan(480);
    expect(info.width / info.height).toBeCloseTo(4 / 3, 1);
    await expect(page.getByText(new RegExp(`Scaled down to ${info.width} × ${info.height} px`))).toBeVisible();
  });

  test("PNG: palette at the recommended level keeps transparency; low level is lossless", async ({ page }) => {
    await page.goto("/pt/comprimir-imagem", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo-alpha.png")]);
    const quantized = fileOf(await runTool(page, "Comprimir imagens"));
    expect(quantized.name).toBe("photo-alpha.png");
    expect(quantized.buf.length).toBeLessThan(alphaPng.length * 0.6);
    const meta = await sharp(quantized.buf).metadata();
    expect(meta).toMatchObject({ format: "png", width: 360, height: 270, isPalette: true });
    const px = await rawPixels(quantized.buf);
    expect(px[3]).toBe(0); // corner: transparent
    expect(px[(135 * 360 + 180) * 4 + 3]).toBe(255); // center: opaque

    await page.getByRole("button", { name: "Começar de novo" }).click();
    await pick(page, [fixturePath("photo-alpha.png")]);
    await choose(page, "Baixa \\(melhor qualidade\\)");
    const lossless = fileOf(await runTool(page, "Comprimir imagens"));
    expect(lossless.buf.length).toBeLessThanOrEqual(alphaPng.length);
    // Lossless for everything visible (fully transparent pixels may lose their hidden color).
    expect(visible(await rawPixels(lossless.buf)).equals(visible(await rawPixels(alphaPng)))).toBe(true);
  });

  test("format change: JPG → WEBP and transparent PNG → AVIF", async ({ page }) => {
    await page.goto("/fr/compresser-image", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg"), fixturePath("photo-alpha.png")]);
    await choose(page, "AVIF");
    await page.getByRole("button", { name: "Compresser les images", exact: true }).click();
    const links = page.locator("main a[download]");
    await expect(links).toHaveCount(2, { timeout: 60_000 });
    const jpgOut = fileOf(await waitForResult(page, links.nth(0), toolAlert(page)));
    const pngOut = fileOf(await waitForResult(page, links.nth(1), toolAlert(page)));
    expect([jpgOut.name, pngOut.name]).toEqual(["photo.avif", "photo-alpha.avif"]);
    expect(await inspectImage(jpgOut.buf)).toMatchObject({ format: "avif", width: 1000, height: 750 });
    expect((await rawPixels(pngOut.buf))[3]).toBeLessThan(10);

    await page.getByRole("button", { name: "Recommencer" }).click();
    await pick(page, [fixturePath("photo.jpg")]);
    await choose(page, "WEBP");
    const webp = fileOf(await runTool(page, "Compresser les images"));
    expect(webp.name).toBe("photo.webp");
    expect(await inspectImage(webp.buf)).toMatchObject({ format: "webp", width: 1000, height: 750 });
  });

  test("an already optimized file comes back unchanged, and a damaged one fails alone", async ({ page }) => {
    await page.goto("/es/comprimir-imagen", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg")]);
    await choose(page, "Fuerte \\(archivo más liviano\\)");
    const strong = fileOf(await runTool(page, "Comprimir imágenes"));
    const dir = mkdtempSync(join(tmpdir(), "compress-"));
    writeFileSync(join(dir, "strong.jpg"), strong.buf);

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await pick(page, [join(dir, "strong.jpg"), fixturePath("corrupt/truncated.jpg")]);
    await choose(page, "Baja \\(mejor calidad\\)");
    await page.getByRole("button", { name: "Comprimir imágenes", exact: true }).click();
    const items = page.locator("main ul").filter({ has: page.locator("a[download]") }).locator("li");
    await expect(items).toHaveCount(2, { timeout: 60_000 });
    await expect(items.nth(1)).toContainText("dañado");
    const kept = fileOf(await waitForResult(page, page.locator("main a[download]").first(), toolAlert(page)));
    expect(kept.buf.equals(strong.buf)).toBe(true);
    await expect(page.getByText("strong.jpg: ya estaba optimizada")).toBeVisible();
  });
});
