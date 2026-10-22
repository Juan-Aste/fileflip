// "Convert DXF": the SVG is read back with fast-xml-parser and rasterized with
// sharp (librsvg), independent of the code that wrote it, and pixels are
// checked where the fixture's shapes are.
import { XMLParser } from "fast-xml-parser";
import sharp from "sharp";
import { expect, fileOf, openWithFiles, runTool, test } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "the DXF converter must not call the server").toEqual([]);
});

/** plan.dxf spans x −13..163 and y −2..93 mm; the SVG adds a margin of 2 % of the 176 mm side. */
const PAD = 176 * 0.02;
const toSvg = (x: number, y: number) => [x + 13 + PAD, 93 - y + PAD];

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
    const pixel = (x: number, y: number, dx = 0, dy = 0) => {
      const [sx, sy] = toSvg(x, y);
      const o = ((Math.round(sy! * k) + dy) * info.width + Math.round(sx! * k) + dx) * 3;
      return [data[o]!, data[o + 1]!, data[o + 2]!];
    };
    // Lines are ~1 px wide and antialiased: look within 2 px of the point.
    const near = (x: number, y: number, test: (rgb: number[]) => boolean) => {
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (test(pixel(x, y, dx, dy))) return true;
      return false;
    };
    const isRed = ([r, g, b]: number[]) => r! > 150 && r! - g! > 80 && r! - b! > 80;
    const isBlue = ([r, g, b]: number[]) => b! > 150 && b! - r! > 80 && b! - g! > 80;
    const isDark = ([r, g, b]: number[]) => r! < 110 && g! < 110 && b! < 110;
    const isWhite = ([r, g, b]: number[]) => r! > 240 && g! > 240 && b! > 240;
    expect(near(100, 25, isRed), "right edge of the red rectangle").toBe(true);
    expect(near(60, 25, isBlue), "the blue circle (50,25) r10").toBe(true);
    expect(isDark(pixel(5, 65)), "inside the filled SOLID").toBe(true);
    expect(near(-10, 93, isDark), "top of the circle mirrored to (−10,90)").toBe(true);
    expect(isWhite(pixel(50, 25)), "center of the circle (white background)").toBe(true);
    expect(isWhite(pixel(-5, 30)), "empty area").toBe(true);
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
