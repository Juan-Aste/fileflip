import { describe, expect, it } from "vitest";
import { formatPageRanges, parsePageRanges, rangeLabel } from "./ranges";

describe("parsePageRanges", () => {
  it("parses single pages and ranges", () => {
    expect(parsePageRanges("1-3, 5", 10)).toEqual([[0, 1, 2], [4]]);
    expect(parsePageRanges(" 2 – 4 ; 7 ", 10)).toEqual([[1, 2, 3], [6]]);
  });

  it("supports open-ended ranges", () => {
    expect(parsePageRanges("8-", 10)).toEqual([[7, 8, 9]]);
    expect(parsePageRanges("-2", 10)).toEqual([[0, 1]]);
  });

  it("rejects invalid or out-of-bounds input", () => {
    for (const bad of ["", " , ", "0", "11", "3-1", "a", "1-2-3", "-", "1.5"]) {
      expect(parsePageRanges(bad, 10), bad).toBeNull();
    }
  });
});

describe("rangeLabel", () => {
  it("formats groups for file names", () => {
    expect(rangeLabel([0, 1, 2])).toBe("1-3");
    expect(rangeLabel([4])).toBe("5");
    expect(rangeLabel([])).toBe("");
  });
});

describe("formatPageRanges", () => {
  it("joins consecutive pages into ranges, sorted and without repeats", () => {
    expect(formatPageRanges([4, 0, 1, 2, 2, 9])).toBe("1-3, 5, 10");
    expect(formatPageRanges([])).toBe("");
    expect(formatPageRanges(new Set([7]))).toBe("8");
  });

  it("round-trips with parsePageRanges", () => {
    const pages = [0, 2, 3, 4, 8];
    expect(parsePageRanges(formatPageRanges(pages), 10)!.flat()).toEqual(pages);
  });
});
