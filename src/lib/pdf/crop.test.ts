import { readFileSync } from "node:fs";
import { join } from "node:path";
import { degrees, PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { contentMargins, cropPdf } from "./crop";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const boxes = async (bytes: Uint8Array) =>
  (await PDFDocument.load(bytes)).getPages().map((p) => {
    const b = p.getCropBox();
    return [b.x, b.y, b.width, b.height].map((v) => Math.round(v));
  });

describe("contentMargins", () => {
  it("finds the non-white box, or null on a blank page", () => {
    const w = 10;
    const h = 8;
    const rgba = new Uint8ClampedArray(w * h * 4).fill(255);
    expect(contentMargins(rgba, w, h)).toBeNull();
    for (const [x, y] of [[2, 1], [6, 5]]) rgba.fill(0, (y! * w + x!) * 4, (y! * w + x!) * 4 + 3);
    expect(contentMargins(rgba, w, h)).toEqual({ top: 1, right: 3, bottom: 2, left: 2 });
  });
});

describe("cropPdf", () => {
  it("shrinks the CropBox by visual margins, also on rotated pages, and skips null pages", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([400, 600]);
    doc.addPage([400, 600]).setRotation(degrees(90));
    doc.addPage([400, 600]);
    const m = { top: 10, right: 20, bottom: 30, left: 40 };
    const out = await cropPdf(await doc.save(), [m, m, null]);
    expect(await boxes(out)).toEqual([
      [40, 30, 340, 560],
      // Seen sideways: visual top is the page's right edge, visual left its bottom.
      [10, 40, 360, 540],
      [0, 0, 400, 600],
    ]);
  });

  it("never crops a page away entirely", async () => {
    const out = await cropPdf(fixture("document-1page.pdf"), [{ top: 500, right: 500, bottom: 500, left: 500 }]);
    const [[, , w, h]] = (await boxes(out)) as number[][];
    expect(w).toBeGreaterThanOrEqual(27);
    expect(h).toBeGreaterThanOrEqual(27);
  });

  it("rejects a damaged PDF", async () => {
    await expect(cropPdf(fixture("corrupt/truncated.pdf"), [])).rejects.toMatchObject({ code: "fileDamaged" });
  });
});
