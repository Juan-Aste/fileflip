import { describe, expect, it } from "vitest";
import { makePdf, pageWidths as widths } from "../../../tests/helpers/pdf";
import { mergePdfs, pageCount } from "./ops";

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
