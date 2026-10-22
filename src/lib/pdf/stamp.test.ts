import { readFileSync } from "node:fs";
import { join } from "node:path";
import { degrees, PDFDict, PDFDocument, PDFName, PDFNumber } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { addPageNumbers, addWatermark, pageNumberText, type PageNumberOptions, type RenderText } from "./stamp";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));

/** A3-ish document with a portrait page, a page rotated 90° and a landscape page rotated 270°. */
async function mixedDoc() {
  const doc = await PDFDocument.create();
  doc.addPage([400, 600]);
  doc.addPage([400, 600]).setRotation(degrees(90));
  doc.addPage([600, 400]).setRotation(degrees(270));
  return doc.save();
}

interface Placed {
  text: string;
  /** Text origin as the reader sees it, origin top-left. */
  x: number;
  y: number;
  /** Reading direction as seen, degrees counter-clockwise. */
  angle: number;
  width: number;
  height: number;
}

async function textOf(bytes: Uint8Array): Promise<Placed[][]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const pages: Placed[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const items = (await page.getTextContent()).items as { str: string; transform: number[] }[];
    pages.push(
      items
        .filter((it) => it.str.trim())
        .map((it) => {
          const [a, b, , , e, f] = it.transform as [number, number, number, number, number, number];
          const [x, y] = viewport.convertToViewportPoint(e, f) as [number, number];
          const [x2, y2] = viewport.convertToViewportPoint(e + a, f + b) as [number, number];
          return { text: it.str, x, y, angle: Math.round((Math.atan2(-(y2 - y), x2 - x) * 180) / Math.PI) + 0, width: viewport.width, height: viewport.height };
        }),
    );
  }
  return pages;
}

const numbers = (o: Partial<PageNumberOptions> = {}): PageNumberOptions => ({
  position: "bottom-center",
  template: "{n} / {total}",
  start: 1,
  skipFirst: false,
  size: "medium",
  ...o,
});

describe("addPageNumbers", () => {
  it("numbers every page upright at the visual bottom, also on rotated pages", async () => {
    const pages = await textOf(await addPageNumbers(await mixedDoc(), numbers()));
    expect(pages.map((p) => p.map((t) => t.text))).toEqual([["1 / 3"], ["2 / 3"], ["3 / 3"]]);
    for (const [i, [t]] of pages.entries()) {
      expect(t!.angle, `page ${i + 1}`).toBe(0);
      // Centered (the text starts a bit left of the middle) and ~1 cm above the bottom.
      expect(t!.x).toBeGreaterThan(t!.width / 2 - 25);
      expect(t!.x).toBeLessThan(t!.width / 2);
      expect(t!.height - t!.y).toBeGreaterThan(25);
      expect(t!.height - t!.y).toBeLessThan(40);
    }
    // Rotated pages keep their visual size.
    expect([pages[1]![0]!.width, pages[1]![0]!.height]).toEqual([600, 400]);
  });

  it("puts top-right numbers in the visual top-right corner", async () => {
    const pages = await textOf(await addPageNumbers(await mixedDoc(), numbers({ position: "top-right", template: "{n}" })));
    for (const [t] of pages) {
      expect(t!.width - t!.x).toBeLessThan(40);
      expect(t!.y).toBeLessThan(45);
      expect(t!.angle).toBe(0);
    }
  });

  it("skips the cover and starts where asked, with accents in the template", async () => {
    const out = await addPageNumbers(fixture("document.pdf"), numbers({ skipFirst: true, start: 5, template: "Página {n} de {total}", position: "bottom-left" }));
    const pages = await textOf(out);
    const stamps = pages.map((p) => p.filter((t) => t.text.startsWith("Página")).map((t) => t.text));
    expect(stamps).toEqual([[], ["Página 5 de 6"], ["Página 6 de 6"]]);
  });

  it("needs {n} in the template and fails on a damaged PDF", async () => {
    await expect(addPageNumbers(fixture("document.pdf"), numbers({ template: "Page" }))).rejects.toMatchObject({ code: "invalidRequest" });
    await expect(addPageNumbers(fixture("corrupt/garbage.pdf"), numbers())).rejects.toMatchObject({ code: "fileDamaged" });
  });

  it("draws text Helvetica can't encode with the renderer, embedding each label once", async () => {
    const calls: string[] = [];
    const render: RenderText = async (text, size) => {
      calls.push(text);
      const png = await sharp({ create: { width: 40, height: 12, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
      return { png: new Uint8Array(png), width: size * 3, height: size * 1.3 };
    };
    await expect(addPageNumbers(fixture("document.pdf"), numbers({ template: "第 {n} 页" }))).rejects.toMatchObject({ code: "invalidRequest" });
    const out = await addPageNumbers(fixture("document.pdf"), numbers({ template: "第 {n} 页" }), render);
    expect(calls).toEqual(["第 1 页", "第 2 页", "第 3 页"]);
    expect(Buffer.from(out).toString("latin1").match(/\/Subtype\s*\/Image/g)).toHaveLength(3);
    expect(pageNumberText("{n}/{total}", 2, 9)).toBe("2/9");
  });
});

describe("addWatermark", () => {
  const base = { text: "CONFIDENCIAL", size: "medium" as const, opacity: 0.3, color: [0.8, 0.1, 0.1] as [number, number, number] };

  it("draws one diagonal mark across the center of every page, rotated pages included", async () => {
    const pages = await textOf(await addWatermark(await mixedDoc(), { ...base, layout: "diagonal" }));
    for (const p of pages) {
      expect(p.map((t) => t.text)).toEqual(["CONFIDENCIAL"]);
      const t = p[0]!;
      // Along the visual diagonal, from the lower left.
      expect(Math.abs(t.angle - Math.round((Math.atan2(t.height, t.width) * 180) / Math.PI))).toBeLessThanOrEqual(1);
      expect(t.x).toBeLessThan(t.width / 2);
      expect(t.y).toBeGreaterThan(t.height / 2);
    }
  });

  it("marks only the chosen pages, horizontally, semi-transparent", async () => {
    const out = await addWatermark(fixture("document.pdf"), { ...base, layout: "horizontal", pages: [1] });
    const pages = await textOf(out);
    expect(pages.map((p) => p.filter((t) => t.text === "CONFIDENCIAL").map((t) => t.angle))).toEqual([[], [0], []]);
    // The opacity is a graphics state on the marked page only.
    const doc = await PDFDocument.load(out);
    const alphas = doc.getPages().map((page) => {
      const states = page.node.Resources()?.lookupMaybe(PDFName.of("ExtGState"), PDFDict);
      return states ? states.values().map((s) => (doc.context.lookup(s, PDFDict).get(PDFName.of("ca")) as PDFNumber).asNumber()) : [];
    });
    expect(alphas).toEqual([[], [0.3], []]);
  });

  it("tiles the page with a bounded number of copies", async () => {
    const pages = await textOf(await addWatermark(fixture("document-1page.pdf"), { ...base, text: "BORRADOR", layout: "tiled", size: "small" }));
    const marks = pages[0]!.filter((t) => t.text === "BORRADOR");
    expect(marks.length).toBeGreaterThan(15);
    expect(marks.length).toBeLessThanOrEqual(400);
    expect(new Set(marks.map((t) => t.angle))).toEqual(new Set([30]));
  });

  it("rejects empty text", async () => {
    await expect(addWatermark(fixture("document.pdf"), { ...base, text: "  ", layout: "diagonal" })).rejects.toMatchObject({ code: "invalidRequest" });
  });
});
