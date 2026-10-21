import { describe, expect, it } from "vitest";
import { aspectRatio, fitAspect, isValidCrop, moveRect, resizeCorner, setField, type Rect } from "./crop-rect";

const image = { width: 1000, height: 750 };
const inside = (r: Rect) => expect(isValidCrop(r, image)).toBe(true);

describe("fitAspect", () => {
  it("is the whole image when free, the biggest centered box otherwise", () => {
    expect(fitAspect(image, null)).toEqual({ x: 0, y: 0, width: 1000, height: 750 });
    expect(fitAspect(image, 1)).toEqual({ x: 125, y: 0, width: 750, height: 750 });
    expect(fitAspect(image, 16 / 9)).toEqual({ x: 0, y: 93, width: 1000, height: 563 });
    expect(fitAspect(image, 9 / 16)).toEqual({ x: 289, y: 0, width: 422, height: 750 });
    expect(fitAspect(image, aspectRatio("original", image))).toEqual({ x: 0, y: 0, width: 1000, height: 750 });
  });

  it("works on tiny images", () => {
    const r = fitAspect({ width: 3, height: 2 }, 1);
    expect(r).toEqual({ x: 0, y: 0, width: 2, height: 2 });
  });
});

describe("moveRect", () => {
  it("stops at the edges", () => {
    const r = { x: 100, y: 100, width: 200, height: 100 };
    expect(moveRect(r, -500, 20, image)).toEqual({ x: 0, y: 120, width: 200, height: 100 });
    expect(moveRect(r, 5000, 5000, image)).toEqual({ x: 800, y: 650, width: 200, height: 100 });
  });
});

describe("resizeCorner", () => {
  const r = { x: 100, y: 100, width: 200, height: 200 };

  it("keeps the opposite corner fixed", () => {
    expect(resizeCorner(r, "se", 50, 10, null, image)).toEqual({ x: 100, y: 100, width: 250, height: 210 });
    expect(resizeCorner(r, "nw", 50, 10, null, image)).toEqual({ x: 150, y: 110, width: 150, height: 190 });
    expect(resizeCorner(r, "ne", 20, -20, null, image)).toEqual({ x: 100, y: 80, width: 220, height: 220 });
  });

  it("keeps the ratio and the image bounds", () => {
    const out = resizeCorner(r, "se", 400, 0, 1, image);
    expect(out).toEqual({ x: 100, y: 100, width: 600, height: 600 });
    const capped = resizeCorner(r, "se", 5000, 0, 1, image);
    expect(capped).toEqual({ x: 100, y: 100, width: 650, height: 650 }); // the height runs out first
    inside(capped);
    const west = resizeCorner(r, "nw", -5000, 0, 2, image);
    expect(west.x + west.width).toBe(300);
    expect(west.width / west.height).toBeCloseTo(2, 1);
    inside(west);
  });

  it("never goes below the minimum size or flips over", () => {
    const tiny = resizeCorner(r, "se", -1000, -1000, null, image);
    expect(tiny).toEqual({ x: 100, y: 100, width: 8, height: 8 });
    const flipped = resizeCorner(r, "nw", 1000, 1000, null, image);
    expect(flipped).toEqual({ x: 292, y: 292, width: 8, height: 8 });
  });
});

describe("setField", () => {
  const r = { x: 100, y: 50, width: 400, height: 300 };

  it("moves with x and y, clamped", () => {
    expect(setField(r, "x", 900, null, image)).toMatchObject({ x: 600, width: 400 });
    expect(setField(r, "y", -10, null, image)).toMatchObject({ y: 0 });
  });

  it("changes one side when free, both with a ratio", () => {
    expect(setField(r, "width", 250.4, null, image)).toEqual({ x: 100, y: 50, width: 250, height: 300 });
    expect(setField(r, "height", 2000, null, image)).toEqual({ x: 100, y: 0, width: 400, height: 750 });
    expect(setField(r, "width", 300, 1, image)).toEqual({ x: 100, y: 50, width: 300, height: 300 });
    // Too big from here: the box moves back to fit.
    const big = setField(r, "width", 990, 4 / 3, image);
    expect(big).toEqual({ x: 10, y: 7, width: 990, height: 743 });
    expect(setField(r, "width", Number.NaN, null, image)).toBe(r);
  });
});

describe("isValidCrop", () => {
  it("rejects fractions and boxes outside the image", () => {
    expect(isValidCrop({ x: 0.5, y: 0, width: 10, height: 10 }, image)).toBe(false);
    expect(isValidCrop({ x: 995, y: 0, width: 10, height: 10 }, image)).toBe(false);
    expect(isValidCrop({ x: 0, y: 0, width: 0, height: 10 }, image)).toBe(false);
    expect(isValidCrop({ x: 990, y: 740, width: 10, height: 10 }, image)).toBe(true);
  });
});
