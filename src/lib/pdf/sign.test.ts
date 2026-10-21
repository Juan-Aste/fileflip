import { readFileSync } from "node:fs";
import { join } from "node:path";
import { degrees, PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { signPdf, trimSignature } from "./sign";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
/** A 200×50 "signature": a dark stroke on transparency. */
const signature = async () =>
  new Uint8Array(
    await sharp({ create: { width: 200, height: 50, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: Buffer.from('<svg width="200" height="50"><path d="M5 40 Q 60 0 100 30 T 195 10" stroke="#123" stroke-width="4" fill="none"/></svg>') }])
      .png()
      .toBuffer(),
  );

/** Where each image is drawn, as the reader sees the page: center and size in points, origin top-left. */
async function imagePlacements(bytes: Uint8Array) {
  const { getDocument, OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out: { page: number; cx: number; cy: number; w: number; h: number; pageW: number; pageH: number }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const ops = await page.getOperatorList();
    const stack: number[][] = [];
    let m = [1, 0, 0, 1, 0, 0];
    const mul = (a: number[], b: number[]) => [
      a[0]! * b[0]! + a[1]! * b[2]!,
      a[0]! * b[1]! + a[1]! * b[3]!,
      a[2]! * b[0]! + a[3]! * b[2]!,
      a[2]! * b[1]! + a[3]! * b[3]!,
      a[4]! * b[0]! + a[5]! * b[2]! + b[4]!,
      a[4]! * b[1]! + a[5]! * b[3]! + b[5]!,
    ];
    ops.fnArray.forEach((fn, i) => {
      if (fn === OPS.save) stack.push(m);
      else if (fn === OPS.restore) m = stack.pop() ?? [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform) m = mul(ops.argsArray[i] as number[], m);
      else if (fn === OPS.paintImageXObject) {
        const pt = (u: number, v: number) => viewport.convertToViewportPoint(u * m[0]! + v * m[2]! + m[4]!, u * m[1]! + v * m[3]! + m[5]!) as number[];
        const [x0, y0] = pt(0, 0) as [number, number];
        const [x1, y1] = pt(1, 1) as [number, number];
        out.push({ page: n - 1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), pageW: viewport.width, pageH: viewport.height });
      }
    });
  }
  return out;
}

describe("signPdf", () => {
  it("draws the signature where it was dropped, upright, on plain and rotated pages", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([400, 600]);
    doc.addPage([400, 600]).setRotation(degrees(90));
    const out = await signPdf(await doc.save(), await signature(), [
      { page: 0, x: 0.75, y: 0.9, width: 0.4 },
      { page: 1, x: 0.25, y: 0.2, width: 0.3 },
    ]);
    const [a, b] = await imagePlacements(out);
    expect(a).toMatchObject({ page: 0, pageW: 400, pageH: 600 });
    expect([a!.cx, a!.cy, a!.w, a!.h].map(Math.round)).toEqual([300, 540, 160, 40]);
    // Seen sideways: 600 wide, 400 tall, and the signature still reads left to right (wider than tall).
    expect(b).toMatchObject({ page: 1, pageW: 600, pageH: 400 });
    expect([b!.cx, b!.cy, b!.w, b!.h].map(Math.round)).toEqual([150, 80, 180, 45]);
  });

  it("checks pages and inputs", async () => {
    const pdf = fixture("document-1page.pdf");
    await expect(signPdf(pdf, await signature(), [{ page: 3, x: 0.5, y: 0.5, width: 0.3 }])).rejects.toMatchObject({ code: "pagesOutOfRange" });
    await expect(signPdf(pdf, await signature(), [])).rejects.toMatchObject({ code: "invalidRequest" });
    await expect(signPdf(pdf, new Uint8Array([1, 2, 3]), [{ page: 0, x: 0.5, y: 0.5, width: 0.3 }])).rejects.toMatchObject({ code: "fileDamaged" });
    await expect(signPdf(fixture("corrupt/garbage.pdf"), await signature(), [{ page: 0, x: 0.5, y: 0.5, width: 0.3 }])).rejects.toMatchObject({
      code: "fileDamaged",
    });
  });
});

describe("trimSignature", () => {
  it("crops to the ink with padding, or null when empty", () => {
    const rgba = new Uint8ClampedArray(20 * 10 * 4);
    expect(trimSignature(rgba, 20, 10)).toBeNull();
    rgba[(5 * 20 + 8) * 4 + 3] = 255;
    rgba[(6 * 20 + 12) * 4 + 3] = 255;
    expect(trimSignature(rgba, 20, 10, { pad: 2 })).toEqual({ x: 6, y: 3, width: 9, height: 6 });
  });

  it("turns white paper transparent and keeps dark ink", () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 250, 248, 240, 255, 20, 30, 120, 255]);
    expect(trimSignature(rgba, 3, 1, { removeWhite: true, pad: 0 })).toEqual({ x: 2, y: 0, width: 1, height: 1 });
    expect([rgba[3], rgba[7], rgba[11]]).toEqual([0, 0, 255]);
  });
});
