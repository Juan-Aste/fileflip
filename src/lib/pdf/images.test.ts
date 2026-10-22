import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { extractPdfImages, toRgba, type PdfjsImage } from "./images";
import { originalJpegs } from "./jpegs";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const open = async (bytes: Uint8Array) => {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
};
const encodePng = async (image: PdfjsImage) =>
  new Uint8Array(await sharp(Buffer.from(toRgba(image)), { raw: { width: image.width, height: image.height, channels: 4 } }).png().toBuffer());

async function extract(bytes: Uint8Array, minSide = 16) {
  return extractPdfImages(await open(bytes), { minSide, jpegs: await originalJpegs(bytes), encodePng });
}

/** Page 1: a JPEG photo and a transparent PNG; page 2: the same photo again and a 10×10 dot. */
async function sample() {
  const doc = await PDFDocument.create();
  const jpg = await doc.embedJpg(fixture("photo.jpg"));
  const png = await doc.embedPng(fixture("photo-alpha.png"));
  const dot = await doc.embedPng(await sharp({ create: { width: 10, height: 10, channels: 3, background: "#f00" } }).png().toBuffer());
  const p1 = doc.addPage([600, 800]);
  p1.drawImage(jpg, { x: 20, y: 400, width: 300, height: 200 });
  p1.drawImage(png, { x: 20, y: 100, width: 200, height: 150 });
  const p2 = doc.addPage([600, 800]);
  p2.drawImage(jpg, { x: 50, y: 50, width: 100, height: 70 });
  p2.drawImage(dot, { x: 300, y: 300, width: 10, height: 10 });
  return doc.save();
}

describe("toRgba", () => {
  it("expands RGB and 1-bit gray (1 = white)", () => {
    expect([...toRgba({ width: 2, height: 1, kind: 2, data: new Uint8Array([1, 2, 3, 4, 5, 6]) })]).toEqual([1, 2, 3, 255, 4, 5, 6, 255]);
    expect([...toRgba({ width: 3, height: 1, kind: 1, data: new Uint8Array([0b10100000]) })]).toEqual([255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255]);
  });
});

describe("extractPdfImages", () => {
  it("copies JPEGs byte for byte, decodes the rest to PNG with transparency, skips repeats and tiny images", async () => {
    const images = await extract(await sample());
    expect(images.map(({ page, index, type, width, height }) => ({ page, index, type, width, height }))).toEqual([
      { page: 1, index: 1, type: "jpg", width: 1000, height: 750 },
      { page: 1, index: 2, type: "png", width: 360, height: 270 },
    ]);
    expect(Buffer.from(images[0]!.bytes).equals(Buffer.from(fixture("photo.jpg")))).toBe(true);
    const png = sharp(Buffer.from(images[1]!.bytes));
    expect(await png.metadata()).toMatchObject({ format: "png", width: 360, height: 270, hasAlpha: true });
    // Same pixels as the original PNG (alpha included).
    const [a, b] = await Promise.all([png.ensureAlpha().raw().toBuffer(), sharp(Buffer.from(fixture("photo-alpha.png"))).ensureAlpha().raw().toBuffer()]);
    expect(a.equals(b)).toBe(true);
    // With no minimum the 10×10 dot (page 2) is included too.
    expect((await extract(await sample(), 1)).map((i) => [i.page, i.width])).toEqual([[1, 1000], [1, 360], [2, 10]]);
  });

  it("reads the fixture with a photo on two pages as one JPEG, and a scan", async () => {
    const images = await extract(fixture("document-images.pdf"));
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({ type: "jpg", width: 640, height: 480 });
    expect((await sharp(Buffer.from(images[0]!.bytes)).metadata()).format).toBe("jpeg");
    const scan = await extract(fixture("scan.pdf"));
    expect(scan).toHaveLength(1);
    expect(scan[0]).toMatchObject({ width: 320, height: 240 });
  });

  it("fails with pdfHasNoImages on a text-only PDF and reports progress", async () => {
    const progress: number[] = [];
    const bytes = fixture("document.pdf");
    await expect(
      extractPdfImages(await open(bytes), { minSide: 16, jpegs: {}, encodePng, onProgress: (p) => progress.push(p) }),
    ).rejects.toMatchObject({ code: "pdfHasNoImages" });
    expect(progress).toEqual([1 / 3, 2 / 3, 1]);
  });

  it("returns no originals for damaged or encrypted files", async () => {
    expect(await originalJpegs(fixture("corrupt/garbage.pdf"))).toEqual({});
  });
});
