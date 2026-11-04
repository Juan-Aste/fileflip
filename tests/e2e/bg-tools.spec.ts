// "Remove background", rectangle mode (assisted cutout, GrabCut in a worker, no model): a
// synthetic photo whose right answer we know (a product drawn as SVG over
// stripes, rendered by sharp, with a label the color of the stripes), the
// user's rectangle, "keep" and "remove" strokes, undo/redo, and the download read back
// with sharp (libvips) and compared with the reference mask.
import type { Page } from "@playwright/test";
import sharp from "sharp";
import { axeViolations } from "./axe";
import { expect, fileOf, fixturePath, runTool, test } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "removing a background must not call the server").toEqual([]);
});

const W = 800;
const H = 600;
const inProduct = (x: number, y: number) => ((x - 400) / 160) ** 2 + ((y - 260) / 130) ** 2 <= 1 || (x >= 290 && x < 510 && y >= 380 && y < 520);
/** A label on the box, the same color as the stripes behind: the cut loses it until a "keep" stroke. */
const LABEL = { x: 330, y: 410, width: 140, height: 80 };

async function productPhoto(): Promise<Buffer> {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<defs><radialGradient id="b" cx="40%" cy="35%"><stop offset="0" stop-color="#ff6a5a"/><stop offset="1" stop-color="#9a0d00"/></radialGradient>` +
    `<pattern id="s" width="36" height="36" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="36" height="36" fill="#8fc7a0"/><rect width="18" height="36" fill="#a7d8c6"/></pattern></defs>` +
    `<rect width="100%" height="100%" fill="url(#s)"/>` +
    `<ellipse cx="400" cy="260" rx="160" ry="130" fill="url(#b)"/><rect x="290" y="380" width="220" height="140" fill="#2f4a9a"/>` +
    `<rect x="${LABEL.x}" y="${LABEL.y}" width="${LABEL.width}" height="${LABEL.height}" fill="#a7d8c6"/></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

async function alphaOf(buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { info, at: (x: number, y: number) => data[(y * info.width + x) * 4 + 3]!, rgb: (x: number, y: number) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 3)] };
}

/** A touch pointer as the browser sends it (pointerType "touch") to the editor; WebKit has no touch API in Playwright. */
const touchPointer = (page: Page, type: string, id: number, [x, y]: [number, number]) =>
  page.getByTestId("cutout-editor").evaluate(
    (c, a) => c.dispatchEvent(new PointerEvent(a.type, { pointerId: a.id, pointerType: "touch", isPrimary: a.id === 1, clientX: a.x, clientY: a.y, button: 0, buttons: a.type === "pointerup" ? 0 : 1, bubbles: true, cancelable: true })),
    { type, id, x, y },
  );

/** The alpha channel of a download, row by row. */
async function alphaPlane(buf: Buffer): Promise<Uint8Array> {
  return new Uint8Array(await sharp(buf).ensureAlpha().extractChannel(3).raw().toBuffer());
}

/** Percentage shown in the status line once the cutout is up to date. */
async function keptPercent(page: Page, ready: RegExp): Promise<number> {
  const status = page.getByRole("status").filter({ hasText: ready });
  await expect(status).toBeVisible({ timeout: 30_000 });
  return Number(/(\d+)/.exec(await status.innerText())![1]);
}

/** Alpha of the preview canvas at a photo pixel (removed parts show at ~25 % while painting). */
const previewAlpha = (page: Page, x: number, y: number) =>
  page.getByTestId("cutout-preview").evaluate(
    (c: HTMLCanvasElement, [px, py, w]) => {
      const s = c.width / w;
      return c.getContext("2d")!.getImageData(Math.floor(px * s), Math.floor(py * s), 1, 1).data[3];
    },
    [x, y, W] as const,
  );

/** Screen position of a photo pixel in the zoomable editor (from its current zoom and pan). */
async function toClient(page: Page, x: number, y: number): Promise<[number, number]> {
  const editor = page.getByTestId("cutout-editor");
  const box = (await editor.boundingBox())!;
  const [zoom, px, py] = await editor.evaluate((c) => [Number(c.dataset.zoom), Number(c.dataset.panX), Number(c.dataset.panY)]);
  return [box.x + px! + x * zoom!, box.y + py! + y * zoom!];
}

/** Paints a stroke on the editor with the mouse, in photo pixels. */
async function paint(page: Page, points: [number, number][]) {
  // WebKit drops mouse events outside the viewport.
  await page.getByTestId("cutout-editor").scrollIntoViewIfNeeded();
  await page.mouse.move(...(await toClient(page, ...points[0]!)));
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(...(await toClient(page, ...p)), { steps: 4 });
  await page.mouse.up();
}

/** Sets the brush radius (photo pixels) on the logarithmic size slider. */
async function brushSize(page: Page, radius: number, maxRadius: number) {
  await page.getByLabel(/^(Brush size|Tamaño del pincel)/).fill(String(Math.round((Math.log(radius) / Math.log(maxRadius)) * 1000)));
  await expect(page.getByText(new RegExp(`(Brush size|Tamaño del pincel): ${radius} px`))).toBeVisible();
}

/** Clicks a pill of a ChoiceGroup (the radio itself is visually hidden). */
const pick = (page: Page, label: string) =>
  page.locator("label").filter({ hasText: new RegExp(`^${label.replace(/[()]/g, "\\$&")}$`) }).click();

async function setRect(page: Page, rect: Record<string, number>) {
  for (const [label, value] of Object.entries(rect)) {
    const box = page.getByLabel(label, { exact: true });
    await box.fill(String(value));
    await box.press("Enter");
  }
}

test.describe("tool: remove-background", () => {
  test("@xb rectangle → keep and remove strokes → undo/redo → transparent PNG that matches the reference", async ({ page }) => {
    test.setTimeout(120_000);
    const origins = new Set<string>();
    page.on("request", (r) => origins.add(new URL(r.url()).origin));
    await page.goto("/en/remove-background", { waitUntil: "networkidle" });
    await pick(page, "Objects and products (rectangle)");
    await page.locator('input[type="file"]').setInputFiles({ name: "product.jpg", mimeType: "image/jpeg", buffer: await productPhoto() });
    const ready = /Cutout ready/;
    await keptPercent(page, ready);
    await setRect(page, { "X (px)": 220, "Y (px)": 80, "Width (px)": 540, "Height (px)": 470 });
    const label = [LABEL.x + LABEL.width / 2, LABEL.y + LABEL.height / 2] as const;
    await keptPercent(page, ready);
    await expect.poll(() => previewAlpha(page, ...label), { timeout: 30_000 }).toBe(0);

    // "Keep" over the label brings it back.
    await pick(page, "Brush: keep");
    await brushSize(page, 40, 200);
    await paint(page, [[LABEL.x + 20, label[1]], [LABEL.x + LABEL.width - 20, label[1]]]);
    await expect.poll(() => previewAlpha(page, ...label), { timeout: 30_000 }).toBe(255);
    await keptPercent(page, ready);

    // "Remove" on the ball takes that part out; undo and redo follow. Checked
    // with the rectangle tool, where the preview has no stroke marks or faint copy.
    await pick(page, "Brush: remove");
    await brushSize(page, 10, 200);
    await paint(page, [[380, 200], [420, 200]]);
    await pick(page, "Rectangle");
    await expect.poll(() => previewAlpha(page, 400, 200), { timeout: 30_000 }).toBe(0);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => previewAlpha(page, 400, 200), { timeout: 30_000 }).toBe(255);
    await page.getByRole("button", { name: "Redo" }).click();
    await expect.poll(() => previewAlpha(page, 400, 200), { timeout: 30_000 }).toBe(0);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => previewAlpha(page, 400, 200), { timeout: 30_000 }).toBe(255);
    expect(await previewAlpha(page, ...label)).toBe(255);
    await keptPercent(page, ready);
    expect(await axeViolations(page)).toEqual([]);

    const out = fileOf(await runTool(page, "Remove background"));
    expect(out.name).toBe("product-no-background.png");
    const meta = await sharp(out.buf).metadata();
    expect([meta.format, meta.width, meta.height, meta.hasAlpha]).toEqual(["png", W, H, true]);
    const { at } = await alphaOf(out.buf);
    let inter = 0;
    let union = 0;
    for (let y = 0; y < H; y += 2)
      for (let x = 0; x < W; x += 2) {
        const a = at(x, y) >= 128;
        const b = inProduct(x + 0.5, y + 0.5);
        if (a && b) inter++;
        if (a || b) union++;
      }
    expect(inter / union, "IoU against the reference").toBeGreaterThanOrEqual(0.9);
    expect(at(400, 260)).toBe(255);
    expect(at(label[0], label[1])).toBe(255);
    expect(at(5, 5)).toBe(0);
    expect([...origins]).toEqual([new URL(page.url()).origin]);
  });

  test("white JPG, WEBP over a color, keyboard rectangle, dark mode axe; a damaged photo is reported", async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/es/quitar-fondo", { waitUntil: "networkidle" });
    await pick(page, "Objetos y productos (rectángulo)");
    await page.locator('input[type="file"]').setInputFiles({ name: "producto.jpg", mimeType: "image/jpeg", buffer: await productPhoto() });
    const ready = /Recorte listo/;
    const first = await keptPercent(page, ready);
    // Shift + arrows shrink the rectangle from the keyboard: the bottom of the box is cut off.
    await page.getByRole("group", { name: /Área de recorte/ }).focus();
    for (let i = 0; i < 15; i++) await page.keyboard.press("Shift+ArrowUp");
    await expect.poll(() => keptPercent(page, ready), { timeout: 30_000 }).toBeLessThan(first);
    await page.keyboard.press("Control+z");
    await expect.poll(() => keptPercent(page, ready), { timeout: 30_000 }).toBe(first);
    expect(await axeViolations(page)).toEqual([]);

    await pick(page, "JPG");
    await expect(page.getByText(/^JPG no guarda transparencia/)).toBeVisible();
    const white = fileOf(await runTool(page, "Quitar fondo"));
    expect(white.name).toBe("producto-sin-fondo.jpg");
    expect((await sharp(white.buf).metadata()).format).toBe("jpeg");
    const w = await alphaOf(white.buf);
    expect(w.rgb(5, 5).every((c) => c > 245)).toBe(true);
    const [r, g, b] = w.rgb(400, 260);
    expect(r! > 150 && g! < 110 && b! < 110, `product color ${r},${g},${b}`).toBe(true);

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "producto.jpg", mimeType: "image/jpeg", buffer: await productPhoto() });
    await keptPercent(page, ready);
    await pick(page, "Color");
    await page.getByLabel("Color del fondo").fill("#0000ff");
    await pick(page, "WEBP");
    const blue = fileOf(await runTool(page, "Quitar fondo"));
    expect(blue.name).toBe("producto-sin-fondo.webp");
    const meta = await sharp(blue.buf).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["webp", W, H]);
    const [br, bg, bb] = (await alphaOf(blue.buf)).rgb(5, H - 5);
    expect(br! < 30 && bg! < 30 && bb! > 220, `background ${br},${bg},${bb}`).toBe(true);

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').setInputFiles(fixturePath("corrupt/truncated.jpg"));
    await expect(page.locator("main")).toContainText("dañado o incompleto", { timeout: 20_000 });
  });

  test("@xb people mode: the person is found automatically → transparent PNG that matches the reference, from our domain only", async ({ page }) => {
    test.setTimeout(180_000);
    const origins = new Set<string>();
    page.on("request", (r) => origins.add(new URL(r.url()).origin));
    await page.goto("/en/remove-background", { waitUntil: "networkidle" });
    // Nothing of MediaPipe is downloaded before a photo is opened in "people" mode.
    expect([...origins]).toEqual([new URL(page.url()).origin]);
    await expect(page.getByText(/Automatic mode for photos of people/)).toBeVisible();
    const assets: string[] = [];
    page.on("request", (r) => /mediapipe|\/models\//.test(r.url()) && assets.push(new URL(r.url()).pathname));
    // MediaPipe needs WebGL (in a worker, or on the main thread as a fallback).
    // Headless Firefox without a display has none: the page must say so and
    // download nothing (CI runs this step under xvfb, which gives it WebGL).
    const webgl = await page.evaluate(() => {
      const has = (c: HTMLCanvasElement | OffscreenCanvas) => !!(c.getContext("webgl2") ?? c.getContext("webgl"));
      return typeof OffscreenCanvas !== "undefined" && has(new OffscreenCanvas(1, 1)) ? "worker" : has(document.createElement("canvas")) ? "main" : "none";
    });
    test.info().annotations.push({ type: "webgl", description: webgl });
    await page.locator('input[type="file"]').setInputFiles(fixturePath("people/person.jpg"));
    if (webgl === "none") {
      await expect(page.getByText(/The automatic mode needs WebGL/)).toBeVisible({ timeout: 30_000 });
      expect(assets).toEqual([]);
      expect(await axeViolations(page)).toEqual([]);
      return;
    }
    const ready = /Cutout ready/;
    await keptPercent(page, ready);
    expect(assets.some((a) => a.endsWith(".wasm"))).toBe(true);
    expect(assets.some((a) => a.endsWith(".tflite"))).toBe(true);
    await expect(page.getByText(/couldn't find a clear person/)).toHaveCount(0);
    expect(await axeViolations(page)).toEqual([]);

    const out = fileOf(await runTool(page, "Remove background"));
    expect(out.name).toBe("person-no-background.png");
    const ref = await sharp(fixturePath("people/person-mask.png")).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
    const meta = await sharp(out.buf).metadata();
    expect([meta.format, meta.width, meta.height, meta.hasAlpha]).toEqual(["png", ref.info.width, ref.info.height, true]);
    const { at } = await alphaOf(out.buf);
    let inter = 0;
    let union = 0;
    let transparent = 0;
    for (let y = 0; y < ref.info.height; y++)
      for (let x = 0; x < ref.info.width; x++) {
        const a = at(x, y) >= 128;
        const b = ref.data[y * ref.info.width + x]! >= 128;
        if (a && b) inter++;
        if (a || b) union++;
        if (at(x, y) === 0) transparent++;
      }
    const score = inter / union;
    console.log(`people mode IoU ${score.toFixed(3)}`);
    expect(score, "IoU against the reference").toBeGreaterThanOrEqual(0.85);
    expect(transparent / (ref.info.width * ref.info.height), "share of fully transparent pixels").toBeGreaterThan(0.2);
    expect([...origins]).toEqual([new URL(page.url()).origin]);
  });

  test("people mode without a person: warns and offers the rectangle mode", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/es/quitar-fondo", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles({ name: "producto.jpg", mimeType: "image/jpeg", buffer: await productPhoto() });
    await expect(page.getByText(/No encontramos una persona clara/)).toBeVisible({ timeout: 60_000 });
    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole("button", { name: "Usar el modo rectángulo" }).click();
    await expect(page.getByRole("radio", { name: "Objetos y productos (rectángulo)" })).toBeChecked();
    await expect(page.getByRole("group", { name: /Área de recorte/ })).toBeVisible();
    await keptPercent(page, /Recorte listo/);
  });

  test("@xb zoom into a corner, restore exactly there with a hard brush, undo: only those pixels change in the download", async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto("/es/quitar-fondo", { waitUntil: "networkidle" });
    await pick(page, "Objetos y productos (rectángulo)");
    await page.locator('input[type="file"]').setInputFiles({ name: "producto.jpg", mimeType: "image/jpeg", buffer: await productPhoto() });
    const ready = /Recorte listo/;
    await keptPercent(page, ready);
    const before = await alphaPlane(fileOf(await runTool(page, "Quitar fondo")).buf);
    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "producto.jpg", mimeType: "image/jpeg", buffer: await productPhoto() });
    await keptPercent(page, ready);

    // Zoom in on the top-left corner: Ctrl + wheel where the pointer is (buttons on touch screens).
    const editor = page.getByTestId("cutout-editor");
    await editor.scrollIntoViewIfNeeded();
    if (test.info().project.use.hasTouch) for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Acercar" }).click();
    else {
      await page.mouse.move(...(await toClient(page, 30, 30)));
      for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -240);
    }
    await expect.poll(async () => Number(await editor.getAttribute("data-zoom"))).toBeGreaterThanOrEqual(3);
    // Move to the corner: space + drag on a desktop, the hand tool on a touch screen (the view stops at the photo's edge).
    const touchScreen = !!test.info().project.use.hasTouch;
    if (touchScreen) await pick(page, "Mano (mover)");
    const box = (await editor.boundingBox())!;
    const atCorner = async () => Number(await editor.getAttribute("data-pan-x")) === 0 && Number(await editor.getAttribute("data-pan-y")) === 0;
    for (let i = 0; i < 12 && !(await atCorner()); i++) {
      const from: [number, number] = [box.x + 10, box.y + 10];
      const to: [number, number] = [box.x + box.width - 10, box.y + box.height - 10];
      if (touchScreen) {
        await touchPointer(page, "pointerdown", 7, from);
        for (let k = 1; k <= 5; k++) await touchPointer(page, "pointermove", 7, [from[0] + ((to[0] - from[0]) * k) / 5, from[1] + ((to[1] - from[1]) * k) / 5]);
        await touchPointer(page, "pointerup", 7, to);
        continue;
      }
      await page.mouse.move(...from);
      await page.keyboard.down("Space");
      await page.mouse.down();
      await page.mouse.move(...to, { steps: 5 });
      await page.mouse.up();
      await page.keyboard.up("Space");
    }
    // Panning painted nothing.
    await expect(page.getByRole("button", { name: "Deshacer" })).toBeDisabled();
    const [cx, cy] = await toClient(page, 30, 30);
    const eb = (await editor.boundingBox())!;
    expect(cx > eb.x && cx < eb.x + eb.width && cy > eb.y && cy < eb.y + eb.height, "the corner is on screen").toBe(true);

    await pick(page, "Restaurar");
    await pick(page, "Duro");
    await brushSize(page, 6, 200);
    await paint(page, [[20, 30], [50, 30]]);
    await expect.poll(() => previewAlpha(page, 35, 30)).toBe(255);
    expect(await previewAlpha(page, 35, 50)).toBe(0);
    expect(await axeViolations(page)).toEqual([]);
    // Undo and redo the stroke.
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect.poll(() => previewAlpha(page, 35, 30)).toBe(0);
    await page.getByRole("button", { name: "Rehacer" }).click();
    await expect.poll(() => previewAlpha(page, 35, 30)).toBe(255);

    const after = await alphaPlane(fileOf(await runTool(page, "Quitar fondo")).buf);
    // Within ~1 px of the brush (the pointer maps to photo pixels at this zoom), nothing else.
    const distance = (x: number, y: number) => {
      const t = Math.max(0, Math.min(1, (x + 0.5 - 20) / 30));
      return Math.hypot(x + 0.5 - (20 + 30 * t), y + 0.5 - 30);
    };
    let changed = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const d = distance(x, y);
        const a = after[y * W + x]!;
        const b = before[y * W + x]!;
        if (a !== b) {
          changed++;
          expect(d, `pixel ${x},${y} changed`).toBeLessThanOrEqual(6 + 1.5);
        }
        if (d <= 6 - 1.5) expect(a, `pixel ${x},${y} restored`).toBe(255);
      }
    expect(changed).toBeGreaterThan(300);


  });

  test("@xb touch: one finger paints, two fingers zoom and pan without painting, undo", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/es/quitar-fondo", { waitUntil: "networkidle" });
    await pick(page, "Objetos y productos (rectángulo)");
    await page.locator('input[type="file"]').setInputFiles({ name: "producto.jpg", mimeType: "image/jpeg", buffer: await productPhoto() });
    await keptPercent(page, /Recorte listo/);
    await pick(page, "Borrador");
    await pick(page, "Duro");
    await brushSize(page, 12, 200);
    const editor = page.getByTestId("cutout-editor");
    await editor.scrollIntoViewIfNeeded();
    const touch = (type: string, id: number, at: [number, number]) => touchPointer(page, type, id, at);
    const ball = await toClient(page, 400, 260);
    expect(await previewAlpha(page, 400, 260)).toBe(255);

    // Two fingers: the first one lands, then the second, and they spread apart.
    const zoom0 = Number(await editor.getAttribute("data-zoom"));
    await touch("pointerdown", 1, [ball[0] - 10, ball[1]]);
    await touch("pointerdown", 2, [ball[0] + 10, ball[1]]);
    for (let i = 1; i <= 5; i++) {
      await touch("pointermove", 1, [ball[0] - 10 - i * 15, ball[1] + i * 3]);
      await touch("pointermove", 2, [ball[0] + 10 + i * 15, ball[1] + i * 3]);
    }
    await touch("pointerup", 1, [ball[0] - 85, ball[1] + 15]);
    await touch("pointerup", 2, [ball[0] + 85, ball[1] + 15]);
    await expect.poll(async () => Number(await editor.getAttribute("data-zoom"))).toBeGreaterThan(zoom0 * 2);
    expect(await previewAlpha(page, 400, 260), "the pinch must not paint").toBe(255);
    await expect(page.getByRole("button", { name: "Deshacer" })).toBeDisabled();

    // One finger paints.
    const start = await toClient(page, 380, 260);
    const end = await toClient(page, 420, 260);
    await touch("pointerdown", 3, start);
    for (let i = 1; i <= 5; i++) await touch("pointermove", 3, [start[0] + ((end[0] - start[0]) * i) / 5, start[1]]);
    await touch("pointerup", 3, end);
    await expect.poll(() => previewAlpha(page, 400, 260)).toBe(0);
    expect(await previewAlpha(page, 400, 300)).toBe(255);
    expect(await axeViolations(page)).toEqual([]);

    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect.poll(() => previewAlpha(page, 400, 260)).toBe(255);
    await page.getByRole("button", { name: "Rehacer" }).click();
    await expect.poll(() => previewAlpha(page, 400, 260)).toBe(0);
    const out = fileOf(await runTool(page, "Quitar fondo"));
    const { at } = await alphaOf(out.buf);
    expect(at(400, 260)).toBe(0);
    expect(at(400, 300)).toBe(255);
  });
});
