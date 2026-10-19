import { describe, expect, it } from "vitest";
import { flattenAlpha, hasTransparency } from "./pixels";

const img = (...px: number[]) => ({
  data: new Uint8ClampedArray(px),
  width: px.length / 4,
  height: 1,
});

describe("flattenAlpha", () => {
  it("blends transparent pixels over white by default", () => {
    const out = flattenAlpha(img(0, 0, 0, 0, 0, 0, 0, 255, 255, 0, 0, 128));
    expect([...out.data]).toEqual([255, 255, 255, 255, 0, 0, 0, 255, 255, 127, 127, 255]);
  });

  it("supports a custom background and keeps dimensions", () => {
    const out = flattenAlpha(img(10, 20, 30, 0), [1, 2, 3]);
    expect([...out.data]).toEqual([1, 2, 3, 255]);
    expect(out.width).toBe(1);
  });
});

describe("hasTransparency", () => {
  it("detects any non-opaque pixel", () => {
    expect(hasTransparency(img(0, 0, 0, 255, 0, 0, 0, 254))).toBe(true);
    expect(hasTransparency(img(0, 0, 0, 255))).toBe(false);
  });
});
