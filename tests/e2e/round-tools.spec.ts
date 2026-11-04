// "Round image": rounded corners and circle cuts, checked by decoding the
// download with sharp against the generated source (never the app's code).
import type { Page } from "@playwright/test";
import sharp from "sharp";
import { axeViolations } from "./axe";
import { expect, fileOf, runTool, test, toolAlert, waitForResult } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "rounding images must not call the server").toEqual([]);
});

const W = 300;
const H = 200;

/** A lossless, busy source picture (every pixel different), as PNG. */
async function source(): Promise<{ png: Buffer; raw: Buffer }> {
  const raw = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) raw.set([(p * 7) % 256, (p * 13) % 256, ((p >> 3) * 29) % 256, 255], p * 4);
  return { png: await sharp(raw, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer(), raw };
}

async function rgba(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { info, px: (x: number, y: number) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)], data };
}

const pickPill = (page: Page, label: string) => page.locator("label").filter({ hasText: new RegExp(`^${label}$`) }).click();

async function open(page: Page, files: { name: string; buffer: Buffer }[]) {
  await page.goto("/es/redondear-imagen", { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(files.map((f) => ({ ...f, mimeType: "image/png" })));
}

test.describe("tool: round-image", () => {
  test("@xb rounded corners, transparent PNG: corner alpha 0, center identical, soft edge, same size", async ({ page }) => {
    const { png, raw } = await source();
    await open(page, [{ name: "foto.png", buffer: png }]);
    await expect(page.getByTestId("round-preview")).toBeVisible({ timeout: 20_000 });
    await page.getByLabel("Radio", { exact: true }).fill("40");
    await pickPill(page, "px");
    expect(await axeViolations(page)).toEqual([]);
    const out = fileOf(await runTool(page, "Redondear imágenes"));
    expect(out.name).toBe("foto-redondeada.png");
    const { info, px, data } = await rgba(out.buf);
    expect([info.width, info.height, (await sharp(out.buf).metadata()).format]).toEqual([W, H, "png"]);
    for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1], [5, 5]]) expect(px(x!, y!)[3], `corner ${x},${y}`).toBe(0);
    const orig = (x: number, y: number) => [...raw.subarray((y * W + x) * 4, (y * W + x) * 4 + 4)];
    for (const [x, y] of [[150, 100], [40, 3], [3, 100], [W - 41, H - 2]]) expect(px(x!, y!)).toEqual(orig(x!, y!));
    let soft = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 0 && data[i]! < 255) soft++;
    expect(soft, "antialiased edge").toBeGreaterThan(40);
  });

  test("@xb circle over a color: square crop, corners exactly the color (PNG); framing moves the crop", async ({ page }) => {
    const { png, raw } = await source();
    await open(page, [{ name: "foto.png", buffer: png }]);
    await expect(page.getByTestId("round-preview")).toBeVisible({ timeout: 20_000 });
    await pickPill(page, "Círculo");
    await pickPill(page, "Color");
    await page.getByLabel("Color de afuera").fill("#ff8000");
    await page.getByLabel("Encuadre").fill("0");
    const out = fileOf(await runTool(page, "Redondear imágenes"));
    const { info, px } = await rgba(out.buf);
    expect([info.width, info.height]).toEqual([H, H]);
    expect(px(0, 0)).toEqual([255, 128, 0, 255]);
    expect(px(H - 1, H - 1)).toEqual([255, 128, 0, 255]);
    // Framing 0: the square starts at the left edge of the photo.
    expect(px(100, 100)).toEqual([...raw.subarray((100 * W + 100) * 4, (100 * W + 100) * 4 + 4)]);
  });

  test("transparent + JPG is saved as PNG with a notice; JPG over a color has no transparency; batch", async ({ page }) => {
    const { png } = await source();
    await open(page, [
      { name: "a.png", buffer: png },
      { name: "b.png", buffer: png },
    ]);
    await expect(page.getByTestId("round-preview")).toBeVisible({ timeout: 20_000 });
    await pickPill(page, "JPG");
    await expect(page.getByText(/JPG no admite transparencia: se guardará en PNG/)).toBeVisible();
    await expect(page.getByRole("radio", { name: "PNG" })).toBeChecked();
    expect(await axeViolations(page)).toEqual([]);

    await pickPill(page, "Color");
    await expect(page.getByText(/JPG no admite transparencia/)).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "JPG" })).toBeChecked();
    await page.getByLabel("Color de afuera").fill("#0000ff");
    await page.getByRole("button", { name: "Redondear imágenes", exact: true }).click();
    const links = page.locator("main a[download]");
    await expect(links).toHaveCount(2, { timeout: 60_000 });
    const entries: { name: string; data: Buffer }[] = [];
    for (let i = 0; i < 2; i++) {
      const out = fileOf(await waitForResult(page, links.nth(i), toolAlert(page)));
      entries.push({ name: out.name, data: out.buf });
    }
    expect(entries.map((e) => e.name).sort()).toEqual(["a-redondeada.jpg", "b-redondeada.jpg"]);
    for (const e of entries) {
      const meta = await sharp(e.data).metadata();
      expect([meta.format, meta.width, meta.height, meta.hasAlpha]).toEqual(["jpeg", W, H, false]);
      const [r, g, b] = (await rgba(e.data)).px(0, 0);
      expect(r! < 20 && g! < 20 && b! > 235, `corner ${r},${g},${b}`).toBe(true);
    }
  });
});
