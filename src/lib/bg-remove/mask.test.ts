import { describe, expect, it } from "vitest";
import { applyMask, MODEL_SIDE, modelInput, normalizeMask, parseHexColor, refineAlpha } from "./mask";

const area = MODEL_SIDE * MODEL_SIDE;

describe("modelInput", () => {
  it("is NCHW, divided by the brightest value and normalized like ImageNet", () => {
    const rgba = new Uint8ClampedArray(area * 4);
    rgba.set([200, 100, 0, 255], 0); // first pixel; the rest is black
    const x = modelInput(rgba);
    expect(x.length).toBe(area * 3);
    expect(x[0]).toBeCloseTo((1 - 0.485) / 0.229, 5);
    expect(x[area]).toBeCloseTo((0.5 - 0.456) / 0.224, 5);
    expect(x[2 * area]).toBeCloseTo((0 - 0.406) / 0.225, 5);
    expect(x[1]).toBeCloseTo(-0.485 / 0.229, 5);
    expect(() => modelInput(new Uint8ClampedArray(16))).toThrow();
  });
});

describe("normalizeMask", () => {
  it("stretches between minimum and maximum", () => {
    expect([...normalizeMask(new Float32Array([0.2, 0.6, 1]))]).toEqual([0, 128, 255]);
  });
  it("keeps everything when the map is flat (or not a number)", () => {
    expect([...normalizeMask(new Float32Array([0.3, 0.3]))]).toEqual([255, 255]);
    expect([...normalizeMask(new Float32Array([NaN, NaN]))]).toEqual([255, 255]);
  });
});

describe("refineAlpha", () => {
  it("snaps faint and near-certain values, keeps the edge soft", () => {
    expect(refineAlpha(5)).toBe(0);
    expect(refineAlpha(250)).toBe(255);
    expect(refineAlpha(128)).toBe(128);
    expect(refineAlpha(100)).toBeLessThan(refineAlpha(150));
  });
});

describe("applyMask", () => {
  // Left half subject, right half background.
  const mask = new Uint8Array(area).map((_, i) => (i % MODEL_SIDE < MODEL_SIDE / 2 ? 255 : 0));

  it("transparent: alpha follows the mask, already transparent pixels stay so", () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    rgba[3] = 0; // pixel (0, 0) was transparent
    applyMask(rgba, 4, 4, mask, { kind: "transparent" });
    const alpha = (x: number, y: number) => rgba[(y * 4 + x) * 4 + 3];
    expect([alpha(0, 0), alpha(1, 0), alpha(0, 3), alpha(3, 0), alpha(3, 3)]).toEqual([0, 255, 255, 0, 0]);
  });

  it("color: the background becomes the color and everything is opaque", () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < rgba.length; i += 4) rgba.set([10, 20, 30, 255], i);
    applyMask(rgba, 4, 4, mask, { kind: "color", rgb: [255, 255, 255] });
    expect([...rgba.subarray(0, 4)]).toEqual([10, 20, 30, 255]);
    expect([...rgba.subarray(12, 16)]).toEqual([255, 255, 255, 255]);
  });

  it("refuses a buffer of the wrong size", () => {
    expect(() => applyMask(new Uint8ClampedArray(8), 4, 4, mask, { kind: "transparent" })).toThrow();
  });
});

it("parseHexColor", () => {
  expect(parseHexColor("#1a2B3c")).toEqual([26, 43, 60]);
  expect(parseHexColor("red")).toEqual([255, 255, 255]);
});
