import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { createWorker, OEM } from "tesseract.js";
import { describe, expect, it } from "vitest";
import { TESSDATA_VARIANT } from "@/lib/ocr/assets";
import { OCR_PARAMETERS } from "@/lib/ocr/text";
import { addTextLayers } from "./ocr-layer";

const root = join(__dirname, "../../..");
const fixture = (name: string) => new Uint8Array(readFileSync(join(root, "tests/fixtures", name)));

/** Tesseract's invisible-text page for an image (what the browser tool makes from each rendered page). */
async function layerOf(image: string, lang: string) {
  const worker = await createWorker(lang, OEM.LSTM_ONLY, { langPath: join(root, "node_modules/@tesseract.js-data", lang, TESSDATA_VARIANT), cacheMethod: "none" });
  try {
    await worker.setParameters(OCR_PARAMETERS);
    const { data } = await worker.recognize(join(root, "tests/fixtures", image), { pdfTextOnly: true }, { pdf: true });
    return new Uint8Array(data.pdf!);
  } finally {
    await worker.terminate();
  }
}

/** Text items of each page with their position as the reader sees the page (origin top-left). */
async function readPdf(bytes: Uint8Array) {
  const { getDocument, Util } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const items = ((await page.getTextContent()).items as { str?: string; transform: number[] }[])
      .filter((i): i is { str: string; transform: number[] } => typeof i.str === "string" && i.str.trim() !== "")
      .map((i) => {
        const [, , , , x, y] = Util.transform(viewport.transform, i.transform);
        return { str: i.str, x, y };
      });
    pages.push({ width: viewport.width, height: viewport.height, items, text: items.map((i) => i.str).join(" ") });
  }
  return pages;
}

describe("addTextLayers", { timeout: 60_000 }, () => {
  it("makes a scanned PDF searchable, also on a rotated page, and leaves the rest untouched", async () => {
    const original = fixture("scan-text.pdf");
    const layers = [await layerOf("ocr-es.png", "spa"), await layerOf("ocr-en.jpg", "eng"), null];
    const out = await addTextLayers(original, layers);
    const before = await readPdf(original);
    const after = await readPdf(out);

    expect(before[0]!.text).toBe("");
    expect(after[0]!.text).toContain("papaya");
    expect(after[0]!.text).toContain("1.250");
    expect(after[1]!.text).toContain("Invoice");
    expect(after[1]!.text).toContain("lazy");
    expect(after[2]!.text).toBe(before[2]!.text);

    // Same pages, sizes and rotation; the text lies inside each page as the reader sees it.
    expect(after.map((p) => [p.width, p.height])).toEqual(before.map((p) => [p.width, p.height]));
    for (const page of after.slice(0, 2)) {
      for (const item of page.items) {
        expect(item.x).toBeGreaterThanOrEqual(-1);
        expect(item.x).toBeLessThanOrEqual(page.width + 1);
        expect(item.y).toBeGreaterThanOrEqual(-1);
        expect(item.y).toBeLessThanOrEqual(page.height + 1);
      }
    }
    // Rotated page (landscape for the reader): the lines read top to bottom, left to right.
    const at = (word: string) => after[1]!.items.find((i) => i.str.includes(word))!;
    expect(at("quick").y).toBeLessThan(at("Invoice").y);
    expect(at("quick").x).toBeLessThan(at("fox").x);
    expect(after[1]!.width).toBeGreaterThan(after[1]!.height);

    // The original page content (the scanned images) is kept as it was.
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
    expect(doc.getPage(1).getRotation().angle).toBe(90);
  });

  it("refuses damaged input and a layer count that doesn't match", async () => {
    await expect(addTextLayers(fixture("corrupt/garbage.pdf"), [null])).rejects.toMatchObject({ code: "fileDamaged" });
    await expect(addTextLayers(fixture("scan-text.pdf"), [null])).rejects.toMatchObject({ code: "invalidRequest" });
    await expect(addTextLayers(fixture("scan-text.pdf"), [new Uint8Array([1, 2, 3]), null, null])).rejects.toMatchObject({ code: "conversionFailed" });
  });
});
