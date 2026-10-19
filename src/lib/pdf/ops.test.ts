import { describe, expect, it } from "vitest";
import { makePdf, pageWidths as widths } from "../../../tests/helpers/pdf";
import { PDFDocument } from "pdf-lib";
import { mergePdfs, organizePdf, pageCount, rotatePdf, splitPdf } from "./ops";

describe("mergePdfs", () => {
  it("concatenates pages in file order", async () => {
    const merged = await mergePdfs([await makePdf([100, 200]), await makePdf([300])]);
    expect(await widths(merged)).toEqual([100, 200, 300]);
    expect(await pageCount(merged)).toBe(3);
  });

  it("reports progress per file", async () => {
    const progress: number[] = [];
    await mergePdfs([await makePdf([100]), await makePdf([200])], (p) => progress.push(p));
    expect(progress).toEqual([0.5, 1]);
  });

  it("rejects invalid input", async () => {
    await expect(mergePdfs([new TextEncoder().encode("not a pdf")])).rejects.toThrow();
  });
});

describe("splitPdf", () => {
  it("creates one document per group, keeping page order", async () => {
    const [a, b] = await splitPdf(await makePdf([100, 200, 300, 400]), [[0, 1], [3]]);
    expect(await widths(a)).toEqual([100, 200]);
    expect(await widths(b)).toEqual([400]);
  });

  it("can reorder pages within a group", async () => {
    const [out] = await splitPdf(await makePdf([100, 200, 300]), [[2, 0]]);
    expect(await widths(out)).toEqual([300, 100]);
  });
});

describe("rotatePdf", () => {
  const angles = async (bytes: Uint8Array) =>
    (await PDFDocument.load(bytes)).getPages().map((p) => p.getRotation().angle);

  it("rotates every page by default", async () => {
    expect(await angles(await rotatePdf(await makePdf([100, 200]), 90))).toEqual([90, 90]);
  });

  it("adds to the existing rotation and wraps at 360", async () => {
    const once = await rotatePdf(await makePdf([100, 200]), 270, [1]);
    expect(await angles(once)).toEqual([0, 270]);
    expect(await angles(await rotatePdf(once, 180, [1]))).toEqual([0, 90]);
  });
});

describe("organizePdf", () => {
  it("reorders, rotates and drops pages", async () => {
    const out = await organizePdf(await makePdf([100, 200, 300]), [
      { index: 2, rotation: 90 },
      { index: 0, rotation: 0 },
    ]);
    expect(await widths(out)).toEqual([300, 100]);
    const doc = await PDFDocument.load(out);
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([90, 0]);
  });

  it("refuses to produce an empty PDF", async () => {
    await expect(organizePdf(await makePdf([100]), [])).rejects.toThrow();
  });
});
