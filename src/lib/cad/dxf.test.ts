import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { XMLParser } from "fast-xml-parser";
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from "pdf-lib";
import { ConversionError } from "@/lib/convert-error";
import { bulgedPolyline, parseDxf, plainText, splinePoints } from "./dxf";
import { drawingToPdf } from "./pdf";
import { drawingToSvg } from "./svg";

const fixture = (name: string) => readFileSync(join(__dirname, "../../../tests/fixtures", name), "utf8");
const code = (run: () => unknown) => {
  try {
    run();
    return "ok";
  } catch (e) {
    return e instanceof ConversionError ? e.code : String(e);
  }
};
const close = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]!) < 1e-6);

describe("parseDxf", () => {
  const plan = parseDxf(fixture("plan.dxf"));
  const byColor = (color: string) => plan.paths.filter((p) => p.color === color);
  const boxOf = (points: [number, number][]) => [Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1])), Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))];

  it("draws every supported entity, in millimeters, and reports the hatch it left out", () => {
    expect(plan.units).toBe("mm");
    expect(plan.skipped).toEqual({ HATCH: 1 });
    // The mirrored circle (−13) on the left, the bolt array (163) on the right; the off and frozen layers aren't there.
    expect(close(plan.bounds, [-13, -2, 163, 93])).toBe(true);
    // Line, half circle, arc, ellipse, spline, solid, mirrored circle, 7 bolt circles: by layer 0 → black.
    expect(byColor("#000000")).toHaveLength(14);
    expect(byColor("#ff0000")).toHaveLength(1); // the rectangle, red by its layer
    expect(byColor("#0000ff")).toHaveLength(1); // the circle with color 5
    expect(byColor("#00ff00")).toHaveLength(7); // the bolt lines take the INSERT's color (BYBLOCK)
  });

  it("places shapes where the file says", () => {
    const [rect] = byColor("#ff0000");
    expect(rect).toMatchObject({ closed: true, points: [[0, 0], [100, 0], [100, 50], [0, 50]] });
    const [circle] = byColor("#0000ff");
    expect(close(boxOf(circle!.points), [40, 15, 60, 35])).toBe(true);
    const solid = plan.paths.find((p) => p.fill)!;
    expect(solid.points).toEqual([[0, 60], [10, 60], [10, 70], [0, 70]]);
    // The scaled, turned bolt: radius 4 at (120,10) and its line now vertical.
    const bolts = byColor("#00ff00").map((p) => boxOf(p.points));
    expect(bolts.some((b) => close(b, [120, 4, 120, 16]))).toBe(true);
    // The array: 3 columns × 2 rows, 10 apart.
    for (const [x, y] of [[140, 0], [150, 0], [160, 0], [140, 10], [150, 10], [160, 10]]) {
      expect(bolts.some((b) => close(b, [x! - 3, y!, x! + 3, y!])), `bolt at ${x},${y}`).toBe(true);
    }
    const ellipse = plan.paths.find((p) => close(boxOf(p.points), [12, 36, 28, 44]));
    expect(ellipse?.closed).toBe(true);
    expect(plan.paths.some((p) => close(boxOf(p.points), [-13, 87, -7, 93])), "circle mirrored by its −Z extrusion").toBe(true);
  });

  it("reads TEXT and MTEXT with their codes", () => {
    expect(plan.texts.map((t) => t.text)).toEqual(["Fileflect plan", "Línea 1", "Línea 2 Ø10"]);
    expect(plan.texts[0]).toMatchObject({ x: 5, y: 55, height: 3, align: "start", baseline: "alphabetic" });
    // MTEXT attached top-left: the first line hangs from (60,60), the next one 1.6 × height lower.
    expect(plan.texts[1]).toMatchObject({ x: 60, y: 60, baseline: "hanging" });
    expect(plan.texts[2]!.y).toBeCloseTo(56);
  });

  it("refuses binary, foreign, cut, empty and self-inserting files with a code", () => {
    expect(code(() => parseDxf(fixture("corrupt/truncated.dxf")))).toBe("fileDamaged");
    expect(code(() => parseDxf(fixture("corrupt/binary.dxf")))).toBe("unsupportedFormat");
    expect(code(() => parseDxf(fixture("corrupt/not-a-dxf.dxf")))).toBe("unsupportedFormat");
    expect(code(() => parseDxf(fixture("corrupt/hidden.dxf")))).toBe("dxfEmpty");
    expect(code(() => parseDxf(fixture("corrupt/self-insert.dxf")))).toBe("dxfTooComplex");
  });
});

describe("geometry helpers", () => {
  it("turns a bulge into an arc through the right side", () => {
    const pts = bulgedPolyline([{ x: 10, y: 10, z: 0, bulge: 1 }, { x: 30, y: 10, z: 0 }], false);
    expect(pts[0]).toEqual([10, 10]);
    expect(pts.at(-1)).toEqual([30, 10]);
    expect(Math.min(...pts.map((p) => p[1]))).toBeCloseTo(0);
    // Negative bulge: clockwise, through (20,20).
    const cw = bulgedPolyline([{ x: 10, y: 10, z: 0, bulge: -1 }, { x: 30, y: 10, z: 0 }], false);
    expect(Math.max(...cw.map((p) => p[1]))).toBeCloseTo(20);
  });

  it("evaluates a B-spline from its knots (a cubic Bézier here)", () => {
    const pts = splinePoints({
      degreeOfSplineCurve: 3,
      knotValues: [0, 0, 0, 0, 1, 1, 1, 1],
      controlPoints: [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 0 }],
    });
    expect(pts[0]).toEqual([0, 0]);
    expect(pts.at(-1)).toEqual([10, 0]);
    const middle = pts[Math.floor(pts.length / 2)]!;
    expect(middle[0]).toBeCloseTo(5);
    expect(middle[1]).toBeCloseTo(7.5);
  });

  it("cleans MTEXT codes", () => {
    expect(plainText("{\\fArial|b1|i0;Bold} \\P2\\U+00B0 %%p0.1 \\{x\\}")).toBe("Bold \n2° ±0.1 {x}");
    expect(plainText("\\A1;\\H2.5;Height\\~text \\S1/2;")).toBe("Height\u00a0text 1/2");
  });
});

describe("drawingToSvg", () => {
  const svg = drawingToSvg(parseDxf(fixture("plan.dxf")), { background: true });
  const doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" }).parse(svg).svg;

  it("writes a valid SVG at real size, with the drawing flipped to Y down", () => {
    // 176 × 95 mm plus 2 % margins of the longest side.
    expect(doc.width).toBe("183.04mm");
    expect(doc.height).toBe("102.04mm");
    expect(doc.viewBox).toBe("0 0 183.04 102.04");
    expect(doc.rect).toMatchObject({ fill: "#ffffff" });
    const paths = doc.g[0].path as { d: string; stroke: string }[];
    // The red rectangle: x + 13 + 3.52, 93 − y + 3.52.
    expect(paths.find((p) => p.stroke === "#ff0000")!.d).toBe("M16.52 96.52L116.52 96.52L116.52 46.52L16.52 46.52Z");
    expect(doc.g[1].text.map((t: { "#text": string }) => t["#text"])).toEqual(["Fileflect plan", "Línea 1", "Línea 2 Ø10"]);
  });

  it("escapes text and has no background when asked", () => {
    const plain = drawingToSvg({ paths: [], texts: [{ x: 0, y: 0, height: 1, rotation: Math.PI / 2, text: "<a & b>", color: "#000000", align: "middle", baseline: "middle" }], bounds: [0, 0, 1, 1], units: null, skipped: {} }, { background: false });
    expect(plain).toContain("&lt;a &amp; b&gt;");
    expect(plain).toContain('transform="rotate(-90');
    expect(plain).not.toContain("<rect");
    expect(plain).toContain('width="1000"');
  });
});

describe("drawingToPdf", () => {
  /** The page's content streams, decoded. */
  async function content(bytes: Uint8Array) {
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPages()[0]!;
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray().map((r) => doc.context.lookup(r)) : [contents];
    return { doc, page, text: streams.map((st) => new TextDecoder("latin1").decode(decodePDFRawStream(st as PDFRawStream).decode())).join("\n") };
  }

  it("fits the drawing on a landscape A4 page with colored vector lines and Helvetica texts", async () => {
    const { data, scale } = await drawingToPdf(parseDxf(fixture("plan.dxf")), { page: "a4", title: "plan" });
    const { doc, page, text } = await content(data);
    expect(doc.getPageCount()).toBe(1);
    expect(page.getSize()).toEqual({ width: 841.89, height: 595.28 });
    expect(doc.getTitle()).toBe("plan");
    // 176 mm wide inside 841.89 − 2 × 28.35 pt.
    expect(scale).toBeCloseTo((841.89 - (2 * 720) / 25.4) / 176, 6);
    expect(text).toContain("1 0 0 RG"); // the red rectangle
    expect(text).toContain("0 0 1 RG"); // the blue circle
    expect(text).toMatch(/\bB\b/); // the filled SOLID (fill and stroke)
    // The red rectangle starts at its corner (0,0): 13 mm right of the drawing's left edge and 2 mm above its bottom, centered on the page.
    const lines = text.split("\n");
    const [mx, my] = lines.slice(lines.indexOf("1 0 0 RG")).find((l) => l.endsWith(" m"))!.split(" ").map(Number);
    expect(mx).toBeCloseTo((841.89 - 176 * scale) / 2 + 13 * scale, 3);
    expect(my).toBeCloseTo((595.28 - 95 * scale) / 2 + 2 * scale, 3);
    expect(text).toMatch(/\/Helvetica-\d+ [\d.]+ Tf/);
    expect(text).toContain("<46696C65666C65637420706C616E> Tj"); // "Fileflect plan"
    expect((text.match(/ Tj/g) ?? []).length).toBe(3);
  });

  it("turns the page upright for tall drawings, uses A3 and replaces unencodable characters without a renderer", async () => {
    const drawing = {
      paths: [{ points: [[0, 0], [10, 40]] as [number, number][], closed: false, fill: false, color: "#000000" }],
      texts: [{ x: 0, y: 0, height: 2, rotation: 0, text: "平面图 A", color: "#000000", align: "start" as const, baseline: "alphabetic" as const }],
      bounds: [0, 0, 10, 40] as [number, number, number, number],
      units: null,
      skipped: {},
    };
    const { page, text } = await content((await drawingToPdf(drawing, { page: "a3", title: "tall" })).data);
    expect(page.getSize()).toEqual({ width: 841.89, height: 1190.55 });
    expect(text).toMatch(/<3F3F3F2041>|\(\?\?\? A\)/);
  });
});
