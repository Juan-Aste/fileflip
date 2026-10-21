// Image tools: outputs are decoded in the test with sharp (format, size,
// pixels, alpha), independently of the app's codecs.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import exifr from "exifr";
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

test.describe("tool: resize-image", () => {
  test("pixels keeping proportions, and the message with both sizes", async ({ page }) => {
    await page.goto("/es/redimensionar-imagen", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg")]);
    const width = page.getByRole("textbox", { name: "Ancho (px)" });
    await width.fill("");
    await expect(page.getByText("Escribe el ancho, el alto o ambos")).toBeVisible();
    await width.fill("400");
    const out = fileOf(await runTool(page, "Redimensionar imágenes"));
    expect(out.name).toBe("photo.jpg");
    expect(await inspectImage(out.buf)).toMatchObject({ format: "jpg", width: 400, height: 300 });
    await expect(page.getByText("photo.jpg: 1000 × 750 → 400 × 300 px")).toBeVisible();
  });

  test("percentage over a batch keeps each format (TIFF stays TIFF, HEIC becomes JPG)", async ({ page }) => {
    await page.goto("/en/resize-image", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg"), fixturePath("image.tiff"), fixturePath("photo.heic"), fixturePath("corrupt/truncated.png")]);
    await choose(page, "By percentage");
    await page.getByRole("textbox", { name: "Percentage (%)" }).fill("50");
    await page.getByRole("button", { name: "Resize images", exact: true }).click();
    const items = page.locator("main ul").filter({ has: page.locator("a[download]") }).locator("li");
    await expect(items).toHaveCount(4, { timeout: 60_000 });
    await expect(items.nth(3)).toContainText("damaged");
    const links = page.locator("main a[download]");
    const jpg = fileOf(await waitForResult(page, links.nth(0), toolAlert(page)));
    const tiff = fileOf(await waitForResult(page, links.nth(1), toolAlert(page)));
    const heic = fileOf(await waitForResult(page, links.nth(2), toolAlert(page)));
    expect(await inspectImage(jpg.buf)).toMatchObject({ format: "jpg", width: 500, height: 375 });
    expect(await inspectImage(tiff.buf)).toMatchObject({ format: "tiff", width: 80, height: 60 });
    expect(heic.name).toBe("photo.jpg");
    const heicSource = await sharp(fixturePath("photo.heic")).metadata().catch(() => null);
    const heicInfo = await inspectImage(heic.buf);
    expect(heicInfo.format).toBe("jpg");
    if (heicSource?.width) expect(heicInfo.width).toBe(Math.round(heicSource.width / 2));
  });

  test("social sizes: crop to fill, or fit with transparent borders", async ({ page }) => {
    await page.goto("/pt/redimensionar-imagem", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg")]);
    await choose(page, "Redes sociais");
    const square = fileOf(await runTool(page, "Redimensionar imagens"));
    expect(await inspectImage(square.buf)).toMatchObject({ format: "jpg", width: 1080, height: 1080 });
    // The sun (right side of the landscape) is still inside the cropped square.
    const sq = await sharp(square.buf).raw().toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => [...sq.data.subarray((y * 1080 + x) * 3, (y * 1080 + x) * 3 + 3)];
    expect(at(1000, 317)[0]).toBeGreaterThan(230);

    await page.getByRole("button", { name: "Começar de novo" }).click();
    await pick(page, [fixturePath("photo.jpg")]);
    await choose(page, "Redes sociais");
    await page.getByRole("combobox", { name: "Medida" }).selectOption("story");
    await choose(page, "Adicionar bordas");
    await choose(page, "PNG");
    const story = fileOf(await runTool(page, "Redimensionar imagens"));
    expect(story.name).toBe("photo.png");
    expect(await inspectImage(story.buf)).toMatchObject({ format: "png", width: 1080, height: 1920 });
    const px = await rawPixels(story.buf);
    expect(px[3]).toBe(0); // top border: transparent
    expect(px[(960 * 1080 + 540) * 4 + 3]).toBe(255); // center: the photo
  });

  test("stretch to an exact size without proportions, as WEBP", async ({ page }) => {
    await page.goto("/fr/redimensionner-image", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo-alpha.png")]);
    await page.getByText("Garder les proportions").click();
    await page.getByRole("textbox", { name: "Largeur (px)" }).fill("300");
    await page.getByRole("textbox", { name: "Hauteur (px)" }).fill("300");
    await choose(page, "WEBP");
    const out = fileOf(await runTool(page, "Redimensionner les images"));
    expect(out.name).toBe("photo-alpha.webp");
    expect(await inspectImage(out.buf)).toMatchObject({ format: "webp", width: 300, height: 300 });
    expect((await rawPixels(out.buf))[3]).toBe(0);
  });
});

test.describe("tool: rotate-image", () => {
  test("90° right moves the transparent corner to the top right; flipping mirrors it", async ({ page }) => {
    await page.goto("/es/rotar-imagen", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("image.png")]);
    const right = fileOf(await runTool(page, "Rotar imágenes"));
    expect(right.name).toBe("image.png");
    expect(await inspectImage(right.buf)).toMatchObject({ format: "png", width: 120, height: 160 });
    let px = await rawPixels(right.buf);
    expect(px[(5 * 120 + 114) * 4 + 3]).toBe(0); // top right: the old top-left corner
    expect(px[(5 * 120 + 5) * 4 + 3]).toBe(255);
    await expect(page.getByText("image.png: 120 × 160 px")).toBeVisible();

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await pick(page, [fixturePath("image.png")]);
    await choose(page, "Solo enderezar");
    await page.getByText("Voltear horizontalmente (espejo)").click();
    const mirrored = fileOf(await runTool(page, "Rotar imágenes"));
    expect(await inspectImage(mirrored.buf)).toMatchObject({ width: 160, height: 120 });
    px = await rawPixels(mirrored.buf);
    expect(px[(5 * 160 + 154) * 4 + 3]).toBe(0);
    expect(px[(5 * 160 + 5) * 4 + 3]).toBe(255);
  });

  test("a sideways phone photo is straightened by its EXIF orientation, without the tag", async ({ page }) => {
    await page.goto("/en/rotate-image", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("exif-gps.jpg"), fixturePath("corrupt/truncated.jpg")]);
    await choose(page, "Just straighten");
    await page.getByRole("button", { name: "Rotate images", exact: true }).click();
    const items = page.locator("main ul").filter({ has: page.locator("a[download]") }).locator("li");
    await expect(items).toHaveCount(2, { timeout: 60_000 });
    await expect(items.nth(1)).toContainText("damaged");
    const out = fileOf(await waitForResult(page, page.locator("main a[download]").first(), toolAlert(page)));
    // Stored 320×240 with orientation 6 → shown and now saved as 240×320.
    expect(await inspectImage(out.buf)).toMatchObject({ format: "jpg", width: 240, height: 320 });
    const meta = await sharp(out.buf).metadata();
    expect(meta.orientation ?? 1).toBe(1);
    expect((await exifr.parse(out.buf, { gps: true }).catch(() => undefined))?.latitude).toBeUndefined();
  });
});

test.describe("tool: remove-exif", () => {
  test("JPG: lists what was found, removes GPS and camera, keeps orientation and pixels", async ({ page }) => {
    const original = readFileSync(fixturePath("exif-gps.jpg"));
    await page.goto("/es/quitar-metadatos-exif", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("exif-gps.jpg")]);
    const out = fileOf(await runTool(page, "Quitar metadatos"));
    expect(out.name).toBe("exif-gps.jpg");
    await expect(page.getByText(/exif-gps\.jpg: se quitó ubicación GPS \(-34\.60000, -58\.36667\) · cámara Fileflect Test Cam 1 · fecha .*2024 · programa fixture-gen · autor Fixture\./)).toBeVisible();
    const tags = await exifr.parse(out.buf, { gps: true, xmp: true, iptc: true });
    expect(tags?.latitude).toBeUndefined();
    expect(tags?.Make).toBeUndefined();
    expect(tags?.Artist).toBeUndefined();
    expect((await sharp(out.buf).metadata()).orientation).toBe(6);
    // Lossless: the same decoded pixels.
    expect((await rawPixels(out.buf)).equals(await rawPixels(original))).toBe(true);
    expect(out.buf.length).toBeLessThan(original.length);
  });

  test("PNG and WEBP lose their EXIF losslessly; a clean file says so; damaged fails alone", async ({ page }) => {
    await page.goto("/en/remove-exif-metadata", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("exif-gps.png"), fixturePath("exif-gps.webp"), fixturePath("image.webp"), fixturePath("corrupt/truncated.png")]);
    await page.getByRole("button", { name: "Remove metadata", exact: true }).click();
    const items = page.locator("main ul").filter({ has: page.locator("a[download]") }).locator("li");
    await expect(items).toHaveCount(4, { timeout: 60_000 });
    await expect(items.nth(3)).toContainText("damaged");
    const links = page.locator("main a[download]");
    for (const [i, name] of [[0, "exif-gps.png"], [1, "exif-gps.webp"]] as const) {
      const out = fileOf(await waitForResult(page, links.nth(i), toolAlert(page)));
      expect(out.name).toBe(name);
      expect(out.buf.toString("latin1")).not.toMatch(/eXIf|EXIF/);
      expect((await rawPixels(out.buf)).equals(await rawPixels(readFileSync(fixturePath(name))))).toBe(true);
    }
    await expect(page.getByText(/exif-gps\.png: removed GPS location/)).toBeVisible();
    await expect(page.getByText("image.webp: had no metadata to remove.")).toBeVisible();
  });

  test("HEIC is saved as a JPG without metadata", async ({ page }) => {
    await page.goto("/pt/remover-metadados-exif", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.heic")]);
    const out = fileOf(await runTool(page, "Remover metadados"));
    expect(out.name).toBe("photo.jpg");
    expect((await inspectImage(out.buf)).format).toBe("jpg");
    expect(await exifr.parse(out.buf).catch(() => undefined)).toBeUndefined();
    await expect(page.getByText(/Salvo como JPG\./)).toBeVisible();
  });
});
