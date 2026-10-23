// Image tools: outputs are decoded in the test with sharp (format, size,
// pixels, alpha), independently of the app's codecs.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import exifr from "exifr";
import jsQR from "jsqr";
import sharp from "sharp";
import { expect, fileOf, fixturePath, inspectImage, runTool, test, toolAlert, unzipEntries, waitForResult } from "./support";

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
  test("JPG at the recommended level: much smaller, same size in pixels", { tag: "@xb" }, async ({ page }) => {
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

test.describe("tool: crop-image", () => {
  const meanDiff = (a: Buffer, b: Buffer) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += Math.abs(a[i]! - b[i]!);
    return sum / a.length;
  };

  test("1:1 takes the biggest centered square, pixels copied from the original", async ({ page }) => {
    await page.goto("/es/recortar-imagen", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg")]);
    await expect(page.getByRole("group", { name: /Área de recorte: 1000 × 750 px/ })).toBeVisible();
    await choose(page, "1:1");
    await expect(page.getByText("Recorte de 750 × 750 px (la imagen mide 1000 × 750 px)")).toBeVisible();
    const out = fileOf(await runTool(page, "Recortar imagen"));
    expect(out.name).toBe("photo.jpg");
    expect(await inspectImage(out.buf)).toMatchObject({ format: "jpg", width: 750, height: 750 });
    const px = await rawPixels(out.buf);
    expect(px[(220 * 750 + 735) * 4]).toBeGreaterThan(230); // the sun at x = 860 - 125
    await expect(page.getByText("photo.jpg: recortada a 750 × 750 px")).toBeVisible();
  });

  test("keyboard and exact fields, saved as PNG", async ({ page }) => {
    await page.goto("/en/crop-image", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg")]);
    const box = page.getByRole("group", { name: /Crop area/ });
    await expect(box).toBeVisible();
    await page.getByRole("textbox", { name: "Width (px)" }).fill("300");
    await page.getByRole("textbox", { name: "Width (px)" }).press("Enter");
    await page.getByRole("textbox", { name: "Height (px)" }).fill("200");
    await page.getByRole("textbox", { name: "Height (px)" }).press("Enter");
    await box.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight"); // 10 px each (1 % of 1000)
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Shift+ArrowDown");
    await expect(page.getByRole("textbox", { name: "X (px)" })).toHaveValue("30");
    await expect(page.getByRole("textbox", { name: "Y (px)" })).toHaveValue("10");
    await expect(page.getByRole("textbox", { name: "Height (px)" })).toHaveValue("220");
    await choose(page, "PNG");
    const out = fileOf(await runTool(page, "Crop image"));
    expect(out.name).toBe("photo.png");
    expect(await inspectImage(out.buf)).toMatchObject({ format: "png", width: 300, height: 220 });
    const expected = await sharp(fixturePath("photo.jpg")).extract({ left: 30, top: 10, width: 300, height: 220 }).ensureAlpha().raw().toBuffer();
    expect(meanDiff(await rawPixels(out.buf), expected)).toBeLessThan(2); // only JPEG decoder rounding differs
  });

  test("works on the image as shown (EXIF orientation) and on HEIC; a damaged file can't be cropped", async ({ page }) => {
    await page.goto("/pt/cortar-imagem", { waitUntil: "networkidle" });
    // Stored 320×240 with orientation 6: it is 240×320 as shown.
    await pick(page, [fixturePath("exif-gps.jpg")]);
    await expect(page.getByText("Corte de 240 × 320 px (a imagem tem 240 × 320 px)")).toBeVisible();
    await choose(page, "9:16");
    const portrait = fileOf(await runTool(page, "Cortar imagem"));
    expect(await inspectImage(portrait.buf)).toMatchObject({ format: "jpg", width: 180, height: 320 });

    await page.getByRole("button", { name: "Começar de novo" }).click();
    await pick(page, [fixturePath("photo.heic")]);
    await choose(page, "1:1");
    await expect(page.getByText("Corte de 80 × 80 px (a imagem tem 120 × 80 px)")).toBeVisible();
    const heic = fileOf(await runTool(page, "Cortar imagem"));
    expect(heic.name).toBe("photo.jpg");
    expect(await inspectImage(heic.buf)).toMatchObject({ format: "jpg", width: 80, height: 80 });

    await page.getByRole("button", { name: "Começar de novo" }).click();
    await pick(page, [fixturePath("corrupt/truncated.png")]);
    await expect(toolAlert(page)).toContainText("danificad");
    await expect(page.getByRole("button", { name: "Cortar imagem", exact: true })).toBeDisabled();
  });
});

/** Share of pixels in a region that differ from the original by more than 40 (any channel). */
async function changedShare(out: Buffer, original: string, region: { left: number; top: number; width: number; height: number }) {
  const a = await sharp(out).extract(region).removeAlpha().raw().toBuffer();
  const b = await sharp(original).extract(region).removeAlpha().raw().toBuffer();
  let changed = 0;
  for (let i = 0; i < a.length; i += 3) {
    if (Math.abs(a[i]! - b[i]!) > 40 || Math.abs(a[i + 1]! - b[i + 1]!) > 40 || Math.abs(a[i + 2]! - b[i + 2]!) > 40) changed++;
  }
  return changed / (a.length / 3);
}
const quadrants = [
  { left: 0, top: 0, width: 500, height: 375 },
  { left: 500, top: 0, width: 500, height: 375 },
  { left: 0, top: 375, width: 500, height: 375 },
  { left: 500, top: 375, width: 500, height: 375 },
];

test.describe("tool: watermark-image", () => {
  test("text in the bottom-right corner only, with a live preview", async ({ page }) => {
    await page.goto("/en/watermark-image", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg")]);
    await expect(page.getByRole("img", { name: "Preview (first image)" })).toBeVisible();
    await page.getByRole("textbox", { name: "Watermark text" }).fill("SAMPLE 2026");
    await page.getByRole("slider", { name: /Opacity/ }).fill("100");
    await expect(page.getByText("Opacity: 100%")).toBeVisible();
    await choose(page, "Large");
    await choose(page, "PNG");
    const out = fileOf(await runTool(page, "Add watermark"));
    expect(out.name).toBe("photo.png");
    expect(await inspectImage(out.buf)).toMatchObject({ format: "png", width: 1000, height: 750 });
    const photoPath = fixturePath("photo.jpg");
    expect(await changedShare(out.buf, photoPath, quadrants[0]!)).toBe(0);
    expect(await changedShare(out.buf, photoPath, quadrants[1]!)).toBe(0);
    expect(await changedShare(out.buf, photoPath, quadrants[2]!)).toBe(0);
    expect(await changedShare(out.buf, photoPath, { left: 600, top: 650, width: 380, height: 80 })).toBeGreaterThan(0.05);
  });

  test("a logo in the center can be read back (QR as the logo)", async ({ page }) => {
    await page.goto("/es/marca-de-agua-imagen", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg")]);
    await choose(page, "Logo o imagen");
    await expect(page.getByRole("button", { name: "Agregar marca de agua", exact: true })).toBeDisabled();
    await page.getByLabel("Logo (PNG, JPG o WEBP)").setInputFiles(fixturePath("qr.png"));
    await choose(page, "50 %");
    await page.getByRole("slider", { name: /Opacidad/ }).fill("100");
    // Click the visible cell: the radio itself is a 1 px sr-only input.
    await page.locator('label[title="Centro"]').click();
    await expect(page.getByRole("radio", { name: "Centro", exact: true })).toBeChecked();
    await choose(page, "PNG");
    const out = fileOf(await runTool(page, "Agregar marca de agua"));
    const { data, info } = await sharp(out.buf).extract({ left: 200, top: 75, width: 600, height: 600 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe("https://fileflect.example/qr-test?ok=1");
    expect(await changedShare(out.buf, fixturePath("photo.jpg"), { left: 0, top: 0, width: 150, height: 750 })).toBe(0);
  });

  test("tiled over the whole image, in a batch with HEIC and a damaged file", async ({ page }) => {
    await page.goto("/pt/marca-dagua-imagem", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg"), fixturePath("photo.heic"), fixturePath("corrupt/truncated.png")]);
    await page.getByText("Mosaico (imagem inteira)").click();
    await page.getByRole("button", { name: "Adicionar marca d'água", exact: true }).click();
    const items = page.locator("main ul").filter({ has: page.locator("a[download]") }).locator("li");
    await expect(items).toHaveCount(3, { timeout: 60_000 });
    await expect(items.nth(2)).toContainText("danificad");
    const jpg = fileOf(await waitForResult(page, page.locator('main a[download="photo.jpg"]').first(), toolAlert(page)));
    for (const q of quadrants) expect(await changedShare(jpg.buf, fixturePath("photo.jpg"), q)).toBeGreaterThan(0.01);
  });
});

test.describe("tool: add-text-to-image", () => {
  test("text with a box at the top center; the rest untouched", async ({ page }) => {
    await page.goto("/es/agregar-texto-a-imagen", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.jpg")]);
    await page.getByRole("textbox", { name: "Texto" }).fill("Hola\nSegunda línea ñ");
    await choose(page, "Fondo detrás del texto");
    await page.locator('label[title="Arriba al centro"]').click();
    await expect(page.getByRole("radio", { name: "Arriba al centro" })).toBeChecked();
    await page.getByRole("combobox", { name: "Tipo de letra" }).selectOption("serif");
    await expect(page.getByRole("img", { name: "Vista previa (primera imagen)" })).toBeVisible();
    await choose(page, "PNG");
    const out = fileOf(await runTool(page, "Agregar texto"));
    expect(await inspectImage(out.buf)).toMatchObject({ format: "png", width: 1000, height: 750 });
    const photoPath = fixturePath("photo.jpg");
    expect(await changedShare(out.buf, photoPath, { left: 0, top: 300, width: 1000, height: 450 })).toBe(0);
    // The dark box behind the text darkens the top center band.
    const band = { left: 450, top: 30, width: 100, height: 60 };
    const mean = async (buf: Buffer | string) => (await sharp(buf).extract(band).stats()).channels.slice(0, 3).reduce((a, c) => a + c.mean, 0);
    expect(await mean(out.buf)).not.toBeCloseTo(await mean(photoPath), 0);
    expect(await changedShare(out.buf, photoPath, { left: 350, top: 20, width: 300, height: 140 })).toBeGreaterThan(0.2);
  });
});

/** Entries of an ICO file: side and the embedded PNG. */
function icoEntries(buf: Buffer) {
  expect(buf.readUInt16LE(2)).toBe(1);
  return Array.from({ length: buf.readUInt16LE(4) }, (_, i) => {
    const at = 6 + i * 16;
    const size = buf.readUInt32LE(at + 8);
    const offset = buf.readUInt32LE(at + 12);
    return { side: buf[at] || 256, png: buf.subarray(offset, offset + size) };
  });
}

test.describe("tool: favicon-generator", () => {
  test("the whole pack from a PNG: ICO sizes, PNG sizes, opaque Apple icon, manifest and ZIP", async ({ page }) => {
    await page.goto("/en/favicon-generator", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo-alpha.png")]);
    await page.getByRole("textbox", { name: /Site or app name/ }).fill('My "Site"');
    await page.getByRole("button", { name: "Create favicon", exact: true }).click();
    const link = (name: string) => page.locator(`main a[download="${name}"]`).first();
    const get = async (name: string) => fileOf(await waitForResult(page, link(name), toolAlert(page))).buf;

    const ico = icoEntries(await get("favicon.ico"));
    expect(ico.map((e) => e.side)).toEqual([16, 32, 48]);
    for (const e of ico) expect(await inspectImage(e.png)).toMatchObject({ format: "png", width: e.side, height: e.side });

    const sizes: Record<string, number> = {
      "favicon-16x16.png": 16,
      "favicon-32x32.png": 32,
      "apple-touch-icon.png": 180,
      "android-chrome-192x192.png": 192,
      "android-chrome-512x512.png": 512,
    };
    for (const [name, side] of Object.entries(sizes)) {
      expect(await inspectImage(await get(name))).toMatchObject({ format: "png", width: side, height: side });
    }
    // Transparent background kept (the 4:3 source leaves margins), except on the Apple icon.
    expect((await rawPixels(await get("android-chrome-512x512.png")))[3]).toBe(0);
    expect((await sharp(await get("apple-touch-icon.png")).stats()).isOpaque).toBe(true);

    const manifest = JSON.parse((await get("site.webmanifest")).toString("utf8"));
    expect(manifest.name).toBe('My "Site"');
    expect(manifest.icons).toHaveLength(2);
    expect((await get("favicon-head.html")).toString("utf8")).toContain('<link rel="manifest" href="/site.webmanifest">');

    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Download all/ }).click()]);
    expect(download.suggestedFilename()).toBe("favicon.zip");
    const names = unzipEntries(readFileSync((await download.path())!)).map((e) => e.name).sort();
    expect(names).toEqual(["android-chrome-192x192.png", "android-chrome-512x512.png", "apple-touch-icon.png", "favicon-16x16.png", "favicon-32x32.png", "favicon-head.html", "favicon.ico", "site.webmanifest"]);
  });

  test("an SVG with a script: rasterized without running it, on a colored background", async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), "favicon-"));
    const svg = join(dir, "logo.svg");
    writeFileSync(
      svg,
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100">' +
        "<script>window.top.__svgRan = true; fetch('/api/svg-script-ran');</script>" +
        '<rect width="200" height="100" fill="#1d4ed8"/></svg>',
    );
    await page.goto("/es/generador-de-favicon", { waitUntil: "networkidle" });
    await pick(page, [svg]);
    await choose(page, "De color");
    await page.getByLabel("Color", { exact: true }).fill("#ff0000");
    await page.getByRole("button", { name: "Crear favicon", exact: true }).click();
    const big = fileOf(await waitForResult(page, page.locator('main a[download="android-chrome-512x512.png"]').first(), toolAlert(page))).buf;
    const px = await rawPixels(big);
    expect([...px.subarray(0, 4)]).toEqual([255, 0, 0, 255]); // margin: the chosen background
    const center = (256 * 512 + 256) * 4;
    expect(px[center + 2]).toBeGreaterThan(180); // the blue rectangle
    expect(px[center]).toBeLessThan(60);
    expect(await page.evaluate(() => (window as unknown as { __svgRan?: boolean }).__svgRan)).toBeUndefined();
  });
});

test.describe("tool: svg-converter", () => {
  test("2× PNG at double the declared size; an exact width as JPG", async ({ page }) => {
    await page.goto("/en/svg-converter", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("image.svg")]);
    const png = fileOf(await runTool(page, "Convert SVG"));
    expect(png.name).toBe("image.png");
    expect(await inspectImage(png.buf)).toMatchObject({ format: "png", width: 320, height: 240 });
    const px = await rawPixels(png.buf);
    const at = (x: number) => [...px.subarray((120 * 320 + x) * 4, (120 * 320 + x) * 4 + 3)];
    expect(at(220)[0]).toBeGreaterThan(200); // the orange circle at 2× (cx 110 → 220)
    await expect(page.getByText("image.png: 320 × 240 px")).toBeVisible();

    await page.getByRole("button", { name: "Start over" }).click();
    await pick(page, [fixturePath("image.svg")]);
    await choose(page, "Exact width");
    const widthBox = page.getByRole("textbox", { name: "Width (px)" });
    await widthBox.fill("99999");
    await expect(page.getByText("Enter a whole width between 1 and 8000 px.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Convert SVG", exact: true })).toBeDisabled();
    await widthBox.fill("800");
    await choose(page, "JPG");
    const jpg = fileOf(await runTool(page, "Convert SVG"));
    expect(await inspectImage(jpg.buf)).toMatchObject({ format: "jpg", width: 800, height: 600 });
  });

  test("an SVG's script never runs; a broken SVG fails alone", async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), "svg-"));
    const evil = join(dir, "evil.svg");
    writeFileSync(
      evil,
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100">' +
        '<script>window.top.__svgRan = true; fetch("/api/svg-script-ran");</script>' +
        '<image href="/api/svg-external-image.png" width="10" height="10"/>' +
        '<rect x="20" y="20" width="60" height="60" fill="#16a34a"/></svg>',
    );
    const broken = join(dir, "broken.svg");
    writeFileSync(broken, "<svg xmlns='http://www.w3.org/2000/svg'><rect width='10'");
    await page.goto("/es/convertir-svg", { waitUntil: "networkidle" });
    await pick(page, [evil, broken]);
    await choose(page, "1×");
    await page.getByRole("button", { name: "Convertir SVG", exact: true }).click();
    const items = page.locator("main ul").filter({ has: page.locator("a[download]") }).locator("li");
    await expect(items).toHaveCount(2, { timeout: 60_000 });
    await expect(items.nth(1)).toContainText("dañado");
    const out = fileOf(await waitForResult(page, page.locator('main a[download="evil.png"]'), toolAlert(page)));
    expect(await inspectImage(out.buf)).toMatchObject({ width: 100, height: 100 });
    const px = await rawPixels(out.buf);
    expect(px[3]).toBe(0); // transparent corner
    expect(px[(50 * 100 + 50) * 4 + 1]).toBeGreaterThan(120); // the green square
    expect(await page.evaluate(() => (window as unknown as { __svgRan?: boolean }).__svgRan)).toBeUndefined();
  });
});

test.describe("HEIF input", () => {
  test("a .heif file (mif1 brand) converts to JPG and resizes", async ({ page }) => {
    await page.goto("/en/heic-to-jpg", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.heif")]);
    await page.getByRole("button", { name: /^Convert/ }).first().click();
    const jpg = fileOf(await waitForResult(page, page.locator("main a[download]").first(), toolAlert(page)));
    expect(jpg.name).toBe("photo.jpg");
    expect(await inspectImage(jpg.buf)).toMatchObject({ format: "jpg", width: 120, height: 80 });

    await page.goto("/en/resize-image", { waitUntil: "networkidle" });
    await pick(page, [fixturePath("photo.heif")]);
    await choose(page, "By percentage");
    await page.getByRole("textbox", { name: "Percentage (%)" }).fill("50");
    const half = fileOf(await runTool(page, "Resize images"));
    expect(await inspectImage(half.buf)).toMatchObject({ format: "jpg", width: 60, height: 40 });
  });
});

test.describe("tool: id-photo", () => {
  /** 1000 × 1000: left half red, right half blue (the framing box is centered, so each copy is half and half). */
  const halves = async (side = 1000) => {
    const raw = Buffer.alloc(side * side * 3);
    for (let i = 0; i < side * side; i++) raw.set(i % side < side / 2 ? [220, 30, 30] : [30, 30, 220], i * 3);
    return sharp(raw, { raw: { width: side, height: side, channels: 3 } }).png().toBuffer();
  };
  const isRed = (p: number[]) => p[0]! > 170 && p[1]! < 90 && p[2]! < 90;
  const isBlue = (p: number[]) => p[2]! > 170 && p[0]! < 90 && p[1]! < 90;

  test("3.5 × 4.5 cm: the photo at 600 dpi and a 10 × 15 cm sheet with 8 copies at 300 dpi", async ({ page }) => {
    await page.goto("/en/id-photo-maker", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles({ name: "me.png", mimeType: "image/png", buffer: await halves() });
    await expect(page.getByRole("group", { name: /Crop area: 778 × 1000 px/ })).toBeVisible();
    await page.getByRole("button", { name: "Make ID photo" }).click();
    await expect(page.getByText("3.5 × 4.5 cm photo (827 × 1063 px at 600 dpi).")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("4 × 6 in (10 × 15 cm) sheet with 8 copies and cutting lines.")).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Download all/ }).click()]);
    const entries = unzipEntries(readFileSync((await download.path())!));
    expect(entries.map((e) => e.name).sort()).toEqual(["me-35x45-sheet-4x6.jpg", "me-35x45.jpg"]);

    const photoBuf = entries.find((e) => e.name === "me-35x45.jpg")!.data;
    expect(await sharp(photoBuf).metadata()).toMatchObject({ format: "jpeg", width: 827, height: 1063, density: 600 });
    const photoPx = await sharp(photoBuf).raw().toBuffer();
    const at = (buf: Buffer, width: number, x: number, y: number) => [...buf.subarray((y * width + x) * 3, (y * width + x) * 3 + 3)];
    expect(isRed(at(photoPx, 827, 100, 500)) && isBlue(at(photoPx, 827, 727, 500)), "left red, right blue").toBe(true);

    const sheetBuf = entries.find((e) => e.name === "me-35x45-sheet-4x6.jpg")!.data;
    expect(await sharp(sheetBuf).metadata()).toMatchObject({ format: "jpeg", width: 1800, height: 1200, density: 300 });
    const sheetPx = await sharp(sheetBuf).raw().toBuffer();
    // Landscape 152.4 × 101.6 mm: 4 × 2 copies of 35 × 45 mm, 2 mm apart, centered.
    const mm = (v: number) => Math.round((v / 25.4) * 300);
    const x0 = (152.4 - (4 * 35 + 3 * 2)) / 2;
    const y0 = (101.6 - (2 * 45 + 2)) / 2;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const left = x0 + c * 37;
        const top = y0 + r * 47;
        expect(isRed(at(sheetPx, 1800, mm(left + 8), mm(top + 22))), `copy ${r},${c} left half`).toBe(true);
        expect(isBlue(at(sheetPx, 1800, mm(left + 27), mm(top + 22))), `copy ${r},${c} right half`).toBe(true);
      }
    }
    const gap = at(sheetPx, 1800, mm(x0 / 2), mm(50));
    expect(gap.every((v) => v > 240), "white margin").toBe(true);
  });

  test("another size, a low-resolution warning and a damaged file", async ({ page }) => {
    await page.goto("/es/foto-carnet", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles({ name: "chica.png", mimeType: "image/png", buffer: await halves(200) });
    await expect(page.getByRole("group", { name: /Área de recorte: 156 × 200 px/ })).toBeVisible();
    await page.locator("label").filter({ hasText: /^3 × 4 cm$/ }).click();
    await expect(page.getByRole("group", { name: /Área de recorte: 150 × 200 px/ })).toBeVisible();
    await page.getByRole("button", { name: "Crear foto carnet" }).click();
    await expect(page.getByText(/Foto de 3 × 4 cm \(709 × 945 px a 600 ppp\)\. La zona elegida tiene poca resolución/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Hoja de 10 × 15 cm con 9 copias y líneas de corte.")).toBeVisible();

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').setInputFiles(fixturePath("corrupt/truncated.png"));
    await expect(page.locator("main")).toContainText("dañado o incompleto");
  });
});
