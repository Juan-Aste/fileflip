import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { extractPdfText, pageText } from "./text";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const open = async (bytes: Uint8Array) => {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return getDocument({ data: bytes, verbosity: 0 }).promise;
};

describe("pageText", () => {
  it("breaks lines on EOL marks and vertical jumps, trimming line ends", () => {
    expect(
      pageText([
        { str: "Hola ", transform: [1, 0, 0, 1, 0, 700] },
        { str: "mundo  ", hasEOL: true, transform: [1, 0, 0, 1, 30, 700] },
        { str: "segunda", transform: [1, 0, 0, 1, 0, 680] },
        { str: "tercera", transform: [1, 0, 0, 1, 0, 660] },
        {},
      ]),
    ).toBe("Hola mundo\nsegunda\ntercera");
  });
});

describe("extractPdfText", () => {
  it("reads every page in order, with optional page headings", async () => {
    const plain = await extractPdfText(await open(fixture("document.pdf")));
    expect(plain).toBe(
      [1, 2, 3].map((n) => `Fileflect sample page ${n} of 3\nSynthetic text for automated tests.`).join("\n\n") + "\n",
    );
    const progress: number[] = [];
    const headed = await extractPdfText(await open(fixture("document.pdf")), { pageHeading: (n) => `--- ${n} ---`, onProgress: (p) => progress.push(p) });
    expect(headed.startsWith("--- 1 ---\n\nFileflect sample page 1 of 3\n")).toBe(true);
    expect(headed).toContain("\n\n\n--- 3 ---\n\nFileflect sample page 3 of 3");
    expect(progress).toEqual([1 / 3, 2 / 3, 1]);
  });

  it("keeps accents", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc.addPage().drawText("Canción, açaí y forêt", { x: 50, y: 700, font, size: 14 });
    expect(await extractPdfText(await open(await doc.save()))).toBe("Canción, açaí y forêt\n");
  });

  it("fails with pdfIsScanned on a scan", async () => {
    await expect(extractPdfText(await open(fixture("scan.pdf")))).rejects.toMatchObject({ code: "pdfIsScanned" });
  });
});
