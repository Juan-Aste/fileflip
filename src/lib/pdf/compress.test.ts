import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { compressPdf, type Recompressor, type SourceImage } from "./compress";

async function pdfWithImages() {
  const doc = await PDFDocument.create();
  const noisy = (w: number, h: number) =>
    sharp(Buffer.from(Array.from({ length: w * h * 3 }, () => Math.floor(Math.random() * 256))), {
      raw: { width: w, height: h, channels: 3 },
    });
  const jpg = await doc.embedJpg(await noisy(400, 300).jpeg({ quality: 95 }).toBuffer());
  const png = await doc.embedPng(await noisy(200, 100).png().toBuffer());
  const page = doc.addPage([600, 400]);
  page.drawImage(jpg, { x: 0, y: 0, width: 400, height: 300 });
  page.drawImage(png, { x: 400, y: 0, width: 200, height: 100 });
  return doc.save();
}

function images(bytes: Uint8Array) {
  return PDFDocument.load(bytes).then((doc) =>
    doc.context
      .enumerateIndirectObjects()
      .map(([, o]) => o)
      .filter((o): o is PDFRawStream => o instanceof PDFRawStream && o.dict.get(PDFName.of("Subtype"))?.toString() === "/Image")
      .map((s) => ({ filter: s.dict.get(PDFName.of("Filter"))?.toString(), width: s.dict.get(PDFName.of("Width"))?.toString() })),
  );
}

// Pretends to re-encode into a tiny JPEG at half size.
const fake: Recompressor = async (image) => {
  const width = image.kind === "raw" ? image.width / 2 : 100;
  return { bytes: new Uint8Array(64).fill(1), width, height: 10 };
};

describe("compressPdf", () => {
  it("re-encodes JPEG and raw RGB images as smaller JPEGs", async () => {
    const seen: SourceImage["kind"][] = [];
    const recompress: Recompressor = async (image, settings) => {
      seen.push(image.kind);
      return fake(image, settings);
    };
    const input = await pdfWithImages();
    const { bytes, imagesRecompressed } = await compressPdf(input, "recommended", recompress);
    expect(imagesRecompressed).toBe(2);
    expect(seen.sort()).toEqual(["jpeg", "raw"]);
    expect(bytes.length).toBeLessThan(input.length / 2);
    const out = await images(bytes);
    expect(out.filter((i) => i.filter === "/DCTDecode")).toHaveLength(2);
    expect(out.map((i) => i.width)).toContain("100");
  });

  it("keeps the original when nothing gets smaller", async () => {
    const input = await pdfWithImages();
    const { bytes, imagesRecompressed } = await compressPdf(input, "low", async () => null);
    expect(imagesRecompressed).toBe(0);
    expect(bytes.length).toBeLessThanOrEqual(input.length);
  });

  it("survives a recompressor that throws", async () => {
    const input = await pdfWithImages();
    const { imagesRecompressed } = await compressPdf(input, "strong", async () => {
      throw new Error("boom");
    });
    expect(imagesRecompressed).toBe(0);
  });
});
