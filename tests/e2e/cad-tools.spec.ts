// "Convert DXF": the SVG is read back with fast-xml-parser and rasterized with
// sharp (librsvg), independent of the code that wrote it, and pixels are
// checked where the fixture's shapes are.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { XMLParser } from "fast-xml-parser";
import sharp from "sharp";
import { expect, fileOf, inspectPdf, openWithFiles, runTool, test } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "the DXF converter must not call the server").toEqual([]);
});

/** plan.dxf spans x −13..163 and y −2..93 mm; the SVG adds a margin of 2 % of the 176 mm side. */
const PAD = 176 * 0.02;
const toSvg = (x: number, y: number) => [x + 13 + PAD, 93 - y + PAD];

const isRed = ([r, g, b]: number[]) => r! > 150 && r! - g! > 80 && r! - b! > 80;
const isBlue = ([r, g, b]: number[]) => b! > 150 && b! - r! > 80 && b! - g! > 80;
const isDark = ([r, g, b]: number[]) => r! < 110 && g! < 110 && b! < 110;
const isWhite = ([r, g, b]: number[]) => r! > 240 && g! > 240 && b! > 240;

/** Reads RGB pixels of a picture by drawing coordinates (mm), given where the drawing's box lands in it. */
function sampler(data: Buffer, width: number, channels: number, map: (x: number, y: number) => [number, number]) {
  const pixel = (x: number, y: number, dx = 0, dy = 0) => {
    const [px, py] = map(x, y);
    const o = ((Math.round(py) + dy) * width + Math.round(px) + dx) * channels;
    return [data[o]!, data[o + 1]!, data[o + 2]!];
  };
  // Lines are thin and antialiased: look within 2 px of the point.
  const near = (x: number, y: number, test: (rgb: number[]) => boolean) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (test(pixel(x, y, dx, dy))) return true;
    return false;
  };
  return { pixel, near };
}

const hasPoppler = (() => {
  try {
    execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

test.describe("tool: dxf-converter", () => {
  test("plan.dxf → SVG at real size: shapes, colors, texts and the left-out hatch", async ({ page }) => {
    await openWithFiles(page, "/en/dxf-converter", ["plan.dxf"]);
    const out = fileOf(await runTool(page, "Convert drawing"));
    expect(out.name).toBe("plan.svg");
    await expect(page.locator("main")).toContainText("23 shapes and 3 texts. Not drawn (not supported): HATCH × 1.");

    const svg = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" }).parse(out.buf.toString("utf8")).svg;
    expect([svg.width, svg.height]).toEqual(["183.04mm", "102.04mm"]);
    const paths = svg.g[0].path as { stroke: string }[];
    expect(paths.filter((p) => p.stroke === "#ff0000")).toHaveLength(1);
    expect(paths.filter((p) => p.stroke === "#00ff00")).toHaveLength(7);
    expect(svg.g[1].text.map((t: { "#text": string }) => t["#text"])).toEqual(["Fileflect plan", "Línea 1", "Línea 2 Ø10"]);

    // librsvg picks the pixel size from the mm size and the density; only the proportions are checked.
    const { data, info } = await sharp(out.buf, { density: 108 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(info.width / info.height).toBeCloseTo(183.04 / 102.04, 2);
    expect(info.width).toBeGreaterThan(1000);
    const k = info.width / 183.04;
    const { pixel, near } = sampler(data, info.width, 3, (x, y) => toSvg(x, y).map((v) => v * k) as [number, number]);
    expect(near(100, 25, isRed), "right edge of the red rectangle").toBe(true);
    expect(near(60, 25, isBlue), "the blue circle (50,25) r10").toBe(true);
    expect(isDark(pixel(5, 65)), "inside the filled SOLID").toBe(true);
    expect(near(-10, 93, isDark), "top of the circle mirrored to (−10,90)").toBe(true);
    expect(isWhite(pixel(50, 25)), "center of the circle (white background)").toBe(true);
    expect(isWhite(pixel(-5, 30)), "empty area").toBe(true);
  });

  test("plan.dxf → PNG of the chosen width and → PDF on A3 (vector, read back with poppler)", async ({ page }) => {
    await openWithFiles(page, "/en/dxf-converter", ["plan.dxf"]);
    await page.getByText("PNG (image)", { exact: true }).click();
    await page.getByText("4,000 px", { exact: true }).click();
    const png = fileOf(await runTool(page, "Convert drawing"));
    expect(png.name).toBe("plan.png");
    const { data, info } = await sharp(png.buf).raw().toBuffer({ resolveWithObject: true });
    expect([info.format ?? "raw", info.width, info.height]).toEqual(["raw", 4000, Math.round((102.04 * 4000) / 183.04)]);
    const k = 4000 / 183.04;
    const { pixel, near } = sampler(data, info.width, info.channels, (x, y) => toSvg(x, y).map((v) => v * k) as [number, number]);
    expect(near(100, 25, isRed), "red rectangle edge").toBe(true);
    expect(near(60, 25, isBlue), "blue circle").toBe(true);
    expect(isDark(pixel(5, 65)), "filled SOLID").toBe(true);
    expect(isWhite(pixel(50, 25)), "white background").toBe(true);
    // The text "Fileflect plan" (3 mm tall at (5,55)) leaves dark pixels just above its baseline.
    let ink = 0;
    for (let x = 5.5; x < 25; x += 0.25) if (isDark(pixel(x, 56))) ink++;
    expect(ink, "text pixels").toBeGreaterThan(5);

    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(`${__dirname}/../fixtures/plan.dxf`);
    await page.getByText("PDF (to print)", { exact: true }).click();
    await page.getByText("A3 (fitted, 10 mm margin)", { exact: true }).click();
    const pdf = fileOf(await runTool(page, "Convert drawing"));
    expect(pdf.name).toBe("plan.pdf");
    const facts = await inspectPdf(pdf.buf);
    expect(facts).toMatchObject({ pages: 1, sizes: ["1191×842"], images: 0 });
    test.skip(!hasPoppler, "pdftoppm and pdftotext (poppler) are not installed");
    const dir = mkdtempSync(join(tmpdir(), "dxf-pdf-"));
    try {
      writeFileSync(join(dir, "in.pdf"), pdf.buf);
      expect(execFileSync("pdftotext", [join(dir, "in.pdf"), "-"]).toString("utf8")).toMatch(/Fileflect plan[\s\S]*Línea 1[\s\S]*Línea 2 Ø10/);
      execFileSync("pdftoppm", ["-r", "72", "-png", "-singlefile", join(dir, "in.pdf"), join(dir, "out")]);
      const raster = await sharp(readFileSync(join(dir, "out.png"))).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      // 1 pt per pixel: the 176 × 95 mm drawing fitted in 1190.55 × 841.89 pt minus 28.35 pt margins, centered.
      const s = (1190.55 - (2 * 720) / 25.4) / 176;
      const ox = (1190.55 - 176 * s) / 2;
      const oy = (841.89 - 95 * s) / 2;
      const map = (x: number, y: number): [number, number] => [ox + (x + 13) * s, 841.89 - (oy + (y + 2) * s)];
      const r = sampler(raster.data, raster.info.width, 3, map);
      expect(r.near(100, 25, isRed), "red rectangle edge in the PDF").toBe(true);
      expect(r.near(60, 25, isBlue), "blue circle in the PDF").toBe(true);
      expect(isDark(r.pixel(5, 65)), "filled SOLID in the PDF").toBe(true);
      expect(isWhite(r.pixel(50, 25)), "inside the circle").toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("PDF: text Helvetica can't encode is drawn as an image, Latin text stays text", async ({ page }) => {
    const g = (pairs: [number, string | number][]) => pairs.map(([c, v]) => `${c}\n${v}`).join("\n") + "\n";
    const dxf = g([[0, "SECTION"], [2, "ENTITIES"], [0, "LINE"], [8, "0"], [10, 0], [20, 0], [11, 100], [21, 40], [0, "TEXT"], [8, "0"], [10, 5], [20, 30], [40, 5], [1, "平面图"], [0, "TEXT"], [8, "0"], [10, 5], [20, 10], [40, 5], [1, "Plan"], [0, "ENDSEC"], [0, "EOF"]]);
    await page.goto("/en/dxf-converter");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "zh.dxf", mimeType: "image/vnd.dxf", buffer: Buffer.from(dxf, "utf8") });
    await page.getByText("PDF (to print)", { exact: true }).click();
    const pdf = fileOf(await runTool(page, "Convert drawing"));
    // One transparent PNG: the picture and its alpha mask (SMask) are both image objects.
    expect(await inspectPdf(pdf.buf)).toMatchObject({ pages: 1, sizes: ["842×595"], images: 2 });
    test.skip(!hasPoppler, "pdftotext (poppler) is not installed");
    const dir = mkdtempSync(join(tmpdir(), "dxf-zh-"));
    try {
      writeFileSync(join(dir, "in.pdf"), pdf.buf);
      expect(execFileSync("pdftotext", [join(dir, "in.pdf"), "-"]).toString("utf8").trim()).toBe("Plan");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("transparent background, and broken, binary, empty and self-inserting files fail clearly while a good one converts", async ({ page }) => {
    await openWithFiles(page, "/es/convertir-dxf", ["plan.dxf"]);
    await page.getByText("Fondo blanco (si no, transparente)").click();
    const out = fileOf(await runTool(page, "Convertir plano"));
    expect(out.buf.toString("utf8")).not.toContain("<rect");
    const { data, info } = await sharp(out.buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[3], "transparent corner").toBe(0);
    expect(info.channels).toBe(4);

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(["plan.dxf", "corrupt/truncated.dxf", "corrupt/binary.dxf", "corrupt/not-a-dxf.dxf", "corrupt/hidden.dxf", "corrupt/self-insert.dxf"].map((f) => `${__dirname}/../fixtures/${f}`));
    await page.getByRole("button", { name: "Convertir plano", exact: true }).click();
    const main = page.locator("main");
    await expect(main.getByText("23 trazos y 3 textos.", { exact: false })).toBeVisible({ timeout: 30_000 });
    await expect(main.getByText("dañado o incompleto")).toHaveCount(1);
    await expect(main.getByText("no se puede convertir")).toHaveCount(2);
    await expect(main.getByText("no tiene nada visible")).toHaveCount(1);
    await expect(main.getByText("demasiado complejo")).toHaveCount(1);
  });
});
