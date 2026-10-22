// "Remove background": a synthetic photo (a shaded ball on a textured
// backdrop, drawn as SVG and rendered by sharp), the real model running in
// the page, and the output read back with sharp.
import sharp from "sharp";
import { expect, fileOf, fixturePath, runTool, test } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "removing a background must not call the server").toEqual([]);
});

const W = 900;
const H = 600;
async function ballPhoto(): Promise<Buffer> {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<defs><radialGradient id="b" cx="40%" cy="35%"><stop offset="0" stop-color="#ff6a5a"/><stop offset="1" stop-color="#9a0d00"/></radialGradient>` +
    `<linearGradient id="w" x2="0" y2="1"><stop offset="0" stop-color="#e4e0d8"/><stop offset="1" stop-color="#c9c4ba"/></linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#w)"/><circle cx="${W / 2}" cy="${H / 2}" r="170" fill="url(#b)"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

async function pixel(buf: Buffer, x: number, y: number) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const o = (y * info.width + x) * 4;
  return [data[o]!, data[o + 1]!, data[o + 2]!, data[o + 3]!];
}

test.describe("tool: remove-background", () => {
  test("transparent PNG: the ball stays opaque, the backdrop goes; everything is served by our site", async ({ page }) => {
    const origins = new Set<string>();
    page.on("request", (r) => origins.add(new URL(r.url()).origin));
    await page.goto("/en/remove-background", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles({ name: "ball.jpg", mimeType: "image/jpeg", buffer: await ballPhoto() });
    const out = fileOf(await runTool(page, "Remove background"));
    expect(out.name).toBe("ball-no-background.png");
    await expect(page.getByText(`Background removed (${W} × ${H} px).`)).toBeVisible();
    const meta = await sharp(out.buf).metadata();
    expect([meta.format, meta.width, meta.height, meta.hasAlpha]).toEqual(["png", W, H, true]);
    expect((await pixel(out.buf, W / 2, H / 2))[3]).toBe(255);
    expect((await pixel(out.buf, W / 2 + 120, H / 2))[3]).toBe(255);
    for (const [x, y] of [[5, 5], [W - 5, 5], [5, H - 5], [W - 5, H - 5], [W / 2, 40], [80, H / 2]]) {
      expect((await pixel(out.buf, x!, y!))[3], `alpha at ${x}, ${y}`).toBe(0);
    }
    expect([...origins]).toEqual([new URL(page.url()).origin]);
  });

  test("white JPG and a color; a damaged photo is reported", async ({ page }) => {
    await page.goto("/es/quitar-fondo", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles({ name: "pelota.jpg", mimeType: "image/jpeg", buffer: await ballPhoto() });
    await page.getByText("Blanco (JPG)", { exact: true }).click();
    const white = fileOf(await runTool(page, "Quitar fondo"));
    expect(white.name).toBe("pelota-sin-fondo.jpg");
    expect((await sharp(white.buf).metadata()).format).toBe("jpeg");
    expect((await pixel(white.buf, 5, 5)).slice(0, 3).every((c) => c > 245)).toBe(true);
    const [r, g, b] = await pixel(white.buf, W / 2, H / 2);
    expect(r! > 150 && g! < 110 && b! < 110, `ball color ${r},${g},${b}`).toBe(true);

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "pelota.jpg", mimeType: "image/jpeg", buffer: await ballPhoto() });
    await page.getByText("Color (JPG)", { exact: true }).click();
    await page.getByLabel("Color del fondo").fill("#0000ff");
    const blue = fileOf(await runTool(page, "Quitar fondo"));
    const [br, bg, bb] = await pixel(blue.buf, 5, H - 5);
    expect(br! < 30 && bg! < 30 && bb! > 220, `background ${br},${bg},${bb}`).toBe(true);

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').setInputFiles(fixturePath("corrupt/truncated.jpg"));
    await page.getByRole("button", { name: "Quitar fondo", exact: true }).click();
    await expect(page.locator("main")).toContainText("dañado o incompleto", { timeout: 20_000 });
  });
});
