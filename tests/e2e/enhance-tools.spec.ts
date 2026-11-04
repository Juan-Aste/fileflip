// "Enhance photo" (phase 17): outputs are decoded and measured in the test with
// sharp, independently of the app's codecs and filters.
import sharp from "sharp";
import { axeViolations } from "./axe";
import type { Page } from "@playwright/test";
import { expect, fileOf, fixturePath, inspectImage, runTool, test, toolAlert, waitForResult } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "enhance-photo must not call the server").toEqual([]);
});

/** person.jpg washed out (values squeezed into ~70–190) with a warm cast. */
async function dullPhoto() {
  return sharp(fixturePath("people/person.jpg"))
    .linear([0.45, 0.4, 0.33], [80, 70, 60])
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** Spread of the luma between its 1st and 99th percentile, and the channel means. */
async function measure(buf: Buffer) {
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const luma: number[] = [];
  const sum = [0, 0, 0];
  for (let i = 0; i < data.length; i += 3) {
    luma.push(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!);
    for (let c = 0; c < 3; c++) sum[c]! += data[i + c]!;
  }
  luma.sort((a, b) => a - b);
  const n = info.width * info.height;
  const means = sum.map((v) => v / n);
  return { range: luma[Math.floor(n * 0.99)]! - luma[Math.floor(n * 0.01)]!, means };
}

/** PSNR (dB) of an encoded image against raw RGB pixels of the same size. */
async function psnr(buf: Buffer, reference: Buffer) {
  const px = await sharp(buf).removeAlpha().raw().toBuffer();
  let se = 0;
  for (let i = 0; i < px.length; i++) se += (px[i]! - reference[i]!) ** 2;
  return 10 * Math.log10((255 * 255) / (se / px.length));
}

/** Color cast against the original photo: how unevenly the channel means were scaled (0 = same balance). */
const castAgainst = (means: number[], reference: number[]) => {
  const ratios = means.map((m, c) => m / reference[c]!);
  return Math.max(...ratios) / Math.min(...ratios) - 1;
};

test.describe("tool: enhance-photo", () => {
  test("automatic mode: a dull photo comes back with more contrast and less cast, same size", { tag: "@xb" }, async ({ page }) => {
    const input = await dullPhoto();
    await page.goto("/es/mejorar-foto", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles({ name: "retrato.jpg", mimeType: "image/jpeg", buffer: input });
    await expect(page.getByText("Foto de 480 × 599 px (0,3 MP).")).toBeVisible();
    const out = fileOf(await runTool(page, "Mejorar foto"));
    expect(out.name).toBe("retrato-mejorada.jpg");
    expect(await inspectImage(out.buf)).toMatchObject({ format: "jpg", width: 480, height: 599 });
    const reference = await measure(await sharp(fixturePath("people/person.jpg")).toBuffer());
    const before = await measure(input);
    const after = await measure(out.buf);
    expect(after.range).toBeGreaterThan(before.range * 1.4);
    const castBefore = castAgainst(before.means, reference.means);
    const castAfter = castAgainst(after.means, reference.means);
    expect(castBefore).toBeGreaterThan(0.15);
    expect(castAfter, `cast ${castBefore.toFixed(3)} → ${castAfter.toFixed(3)}`).toBeLessThan(castBefore * 0.85);
    // Closer to the photo before it was faded.
    const original = await sharp(fixturePath("people/person.jpg")).removeAlpha().raw().toBuffer();
    expect(await psnr(out.buf, original)).toBeGreaterThan((await psnr(input, original)) + 3);
    await expect(page.getByText("Foto mejorada (480 × 599 px).")).toBeVisible();

    // Before/after comparison: a slider (keyboard and touch) moves the split.
    const slider = page.getByRole("slider", { name: "Comparar antes y después" });
    await expect(slider).toHaveValue("50");
    const beforeImg = page.locator("main figure img[aria-hidden=true]");
    await expect(beforeImg).toHaveAttribute("style", /inset\(0px 50% 0px 0px\)/);
    await slider.focus();
    await page.keyboard.press("End");
    await expect(slider).toHaveValue("100");
    await expect(beforeImg).toHaveAttribute("style", /inset\(0px 0% 0px 0px\)|inset\(0px\)/);
    await expect(page.locator("main figure img[alt='retrato-mejorada.jpg']")).toBeVisible();
    const box = (await slider.boundingBox())!;
    expect(box.height, "slider tall enough to touch").toBeGreaterThanOrEqual(40);
    expect(await axeViolations(page)).toEqual([]);
  });

  test("automatic mode keeps PNG transparency and rejects a damaged file", async ({ page }) => {
    await page.goto("/en/enhance-photo", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles(fixturePath("photo-alpha.png"));
    const out = fileOf(await runTool(page, "Enhance photo"));
    expect(out.name).toBe("photo-alpha-enhanced.png");
    const original = await sharp(fixturePath("photo-alpha.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const result = await sharp(out.buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([result.info.width, result.info.height]).toEqual([original.info.width, original.info.height]);
    let alphaDiff = 0;
    let colorDiff = 0;
    for (let i = 0; i < result.data.length; i += 4) {
      alphaDiff = Math.max(alphaDiff, Math.abs(result.data[i + 3]! - original.data[i + 3]!));
      if (original.data[i + 3] === 255) colorDiff += Math.abs(result.data[i]! - original.data[i]!);
    }
    expect(alphaDiff).toBe(0);
    expect(colorDiff, "the visible pixels changed").toBeGreaterThan(0);

    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator('input[type="file"]').setInputFiles(fixturePath("corrupt/truncated.png"));
    await expect(page.locator("main")).toContainText("damaged or incomplete");
  });

  /** Variance of the 4-neighbor Laplacian of the luma (higher = more fine detail), measured with sharp's pixels. */
  async function sharpness(buf: Buffer) {
    const { data, info } = await sharp(buf).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    let sum = 0;
    let sum2 = 0;
    let n = 0;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const p = y * w + x;
        const v = data[p - 1]! + data[p + 1]! + data[p - w]! + data[p + w]! - 4 * data[p]!;
        sum += v;
        sum2 += v * v;
        n++;
      }
    return sum2 / n - (sum / n) ** 2;
  }

  /** The test portrait made small (area average): what the AI mode is for. */
  const smallPortrait = (width: number) => sharp(fixturePath("people/person.jpg")).resize(width).png().toBuffer();

  const chooseAi = async (page: Page, factor: "×2" | "×4", labels = { ai: "Ampliar con IA" }) => {
    await page.locator("label").filter({ hasText: new RegExp(`^${labels.ai}$`) }).click();
    await page.locator("label").filter({ hasText: new RegExp(`^${factor.replace("×", "×")} `) }).click();
  };

  test("AI mode x4 and x2: 4× and 2× the size, sharper than bicubic, model only from our domain", { tag: "@xb" }, async ({ page }) => {
    test.setTimeout(240_000);
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    const input = await smallPortrait(64);
    const { width, height } = await sharp(input).metadata();
    await page.goto("/es/mejorar-foto", { waitUntil: "networkidle" });
    expect(requests.some((u) => u.includes("realesr")), "the model is not loaded with the page").toBe(false);
    await page.locator('input[type="file"]').setInputFiles({ name: "chica.png", mimeType: "image/png", buffer: input });
    await chooseAi(page, "×4");
    await expect(page.getByText(/puede tardar varios minutos/)).toBeVisible();
    await page.getByRole("button", { name: "Mejorar foto", exact: true }).click();
    const x4 = fileOf(await waitForResult(page, page.locator("main a[download]").first(), toolAlert(page).first(), 180_000));
    expect(x4.name).toBe("chica-x4.png");
    expect(await inspectImage(x4.buf)).toMatchObject({ format: "png", width: width! * 4, height: height! * 4 });
    const bicubic4 = await sharp(input).resize(width! * 4, height! * 4, { kernel: "cubic" }).png().toBuffer();
    const [aiSharp, bicubicSharp] = [await sharpness(x4.buf), await sharpness(bicubic4)];
    expect(aiSharp, `Laplacian variance AI ${aiSharp.toFixed(1)} vs bicubic ${bicubicSharp.toFixed(1)}`).toBeGreaterThan(bicubicSharp * 1.5);
    const message = page.getByText(/^Foto ampliada ×4 \(256 × \d+ px\) con IA en [\d,]+ s \((WASM|WebGPU)\)\.$/);
    await expect(message).toBeVisible();
    console.log(`[${test.info().project.name}] ${await message.innerText()}`);
    const model = requests.filter((u) => u.includes("realesr-general-x4v3.onnx"));
    expect(model).toHaveLength(1);
    expect(new URL(model[0]!).origin).toBe(new URL(page.url()).origin);
    expect(requests.every((u) => new URL(u).origin === new URL(page.url()).origin || u.startsWith("blob:") || u.startsWith("data:")), "nothing from other origins").toBe(true);

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "chica.png", mimeType: "image/png", buffer: input });
    await chooseAi(page, "×2");
    await page.getByRole("button", { name: "Mejorar foto", exact: true }).click();
    const x2 = fileOf(await waitForResult(page, page.locator("main a[download]").first(), toolAlert(page).first(), 180_000));
    expect(x2.name).toBe("chica-x2.png");
    expect(await inspectImage(x2.buf)).toMatchObject({ format: "png", width: width! * 2, height: height! * 2 });
    const bicubic2 = await sharp(input).resize(width! * 2, height! * 2, { kernel: "cubic" }).png().toBuffer();
    expect(await sharpness(x2.buf)).toBeGreaterThan(await sharpness(bicubic2));
    // The model was not downloaded again (same worker, or the Cache API).
    expect(requests.filter((u) => u.includes("realesr-general-x4v3.onnx")).length).toBeLessThanOrEqual(1);
  });

  test("AI mode can be cancelled, and runs again afterwards", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/es/mejorar-foto", { waitUntil: "networkidle" });
    // ~0.9 MP: minutes on one WASM thread, so it is still running when cancelled.
    const big = await sharp(fixturePath("photo.jpg")).resize(1100, 825).jpeg().toBuffer();
    await page.locator('input[type="file"]').setInputFiles({ name: "grande.jpg", mimeType: "image/jpeg", buffer: big });
    await expect(page.getByText("Foto de 1100 × 825 px (0,9 MP).")).toBeVisible();
    await chooseAi(page, "×2");
    await page.getByRole("button", { name: "Mejorar foto", exact: true }).click();
    await expect(page.getByRole("progressbar")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(toolAlert(page)).toContainText("Se canceló el proceso.");
    await expect(page.locator("main a[download]")).toHaveCount(0);

    // A new run works (a fresh worker; the model comes from the browser cache).
    await page.getByRole("button", { name: "Quitar grande.jpg" }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: "chica.png", mimeType: "image/png", buffer: await smallPortrait(40) });
    await chooseAi(page, "×2");
    await page.getByRole("button", { name: "Mejorar foto", exact: true }).click();
    const out = fileOf(await waitForResult(page, page.locator("main a[download]").first(), toolAlert(page).first(), 120_000));
    expect((await inspectImage(out.buf)).width).toBe(80);
  });

  test("size limit: a photo over 1 MP is refused for AI but accepted by the automatic mode", async ({ page }) => {
    await page.goto("/en/enhance-photo", { waitUntil: "networkidle" });
    const big = await sharp(fixturePath("photo.jpg")).resize(1200, 900).jpeg().toBuffer();
    await page.locator('input[type="file"]').setInputFiles({ name: "big.jpg", mimeType: "image/jpeg", buffer: big });
    await expect(page.getByText("1200 × 900 px photo (1.1 MP).")).toBeVisible();
    const action = page.getByRole("button", { name: "Enhance photo", exact: true });
    await expect(action).toBeEnabled();
    await page.locator("label").filter({ hasText: /^Upscale with AI$/ }).click();
    await expect(toolAlert(page)).toContainText("The photo has 1.1 megapixels and this mode takes up to 1.");
    await expect(action).toBeDisabled();
    expect(await axeViolations(page)).toEqual([]);
    await page.locator("label").filter({ hasText: /^Automatic \(no AI\)$/ }).click();
    await expect(toolAlert(page)).toHaveCount(0);
    await expect(action).toBeEnabled();
  });

  test("found with Ctrl+K and listed in the images category", async ({ page }) => {
    await page.goto("/es/herramientas-de-imagen", { waitUntil: "networkidle" });
    await expect(page.locator('main a[href="/es/mejorar-foto"]').first()).toBeVisible();
    await page.keyboard.press("Control+k");
    const box = page.getByRole("combobox", { name: "Buscar herramientas" });
    await box.fill("mejorar foto");
    const option = page.getByRole("listbox", { name: "Buscar herramientas" }).getByRole("option").first();
    await expect(option).toContainText("Mejorar foto");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/es\/mejorar-foto$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mejorar foto");
  });
});
