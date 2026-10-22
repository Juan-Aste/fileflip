import { describe, expect, it } from "vitest";
import { MAX_SIDE } from "./dimensions";
import { MAX_OUTPUT_PIXELS, planResize, socialPresets } from "./resize-plan";

const photo = { width: 4000, height: 3000 };

describe("planResize", () => {
  it("scales by percent, within 1–400 %", () => {
    expect(planResize(photo, { kind: "percent", percent: 25 })?.size).toEqual({ width: 1000, height: 750 });
    expect(planResize({ width: 100, height: 50 }, { kind: "percent", percent: 300 })?.size).toEqual({ width: 300, height: 150 });
    expect(planResize(photo, { kind: "percent", percent: 0 })).toBeNull();
    expect(planResize(photo, { kind: "percent", percent: 401 })).toBeNull();
  });

  it("keeps the ratio from one side, and only enlarges when asked", () => {
    expect(planResize(photo, { kind: "pixels", width: 1200, keepRatio: true, enlarge: false })?.size).toEqual({ width: 1200, height: 900 });
    expect(planResize(photo, { kind: "pixels", width: 1200, height: 600, keepRatio: true, enlarge: false })?.size).toEqual({ width: 800, height: 600 });
    expect(planResize(photo, { kind: "pixels", width: 8000, keepRatio: true, enlarge: false })?.size).toEqual(photo);
    expect(planResize(photo, { kind: "pixels", width: 6000, keepRatio: true, enlarge: true })?.size).toEqual({ width: 6000, height: 4500 });
  });

  it("stretches to the exact size without keeping the ratio", () => {
    const plan = planResize(photo, { kind: "pixels", width: 500, height: 500, keepRatio: false, enlarge: false });
    expect(plan?.size).toEqual({ width: 500, height: 500 });
    expect(plan?.source).toEqual({ x: 0, y: 0, width: 4000, height: 3000 });
  });

  it("rejects empty or invalid sides and caps huge ones", () => {
    expect(planResize(photo, { kind: "pixels", keepRatio: true, enlarge: false })).toBeNull();
    expect(planResize(photo, { kind: "pixels", width: 0, height: Number.NaN, keepRatio: true, enlarge: false })).toBeNull();
    const huge = planResize(photo, { kind: "pixels", width: 100_000, height: 50_000, keepRatio: false, enlarge: false });
    expect(huge!.size.width * huge!.size.height).toBeLessThanOrEqual(MAX_OUTPUT_PIXELS);
    expect(huge!.size.width / huge!.size.height).toBeCloseTo(2, 2);
    expect(huge!.size.width).toBeLessThanOrEqual(MAX_SIDE);
    const big = planResize(photo, { kind: "percent", percent: 400 });
    expect(big!.size.width * big!.size.height).toBeLessThanOrEqual(MAX_OUTPUT_PIXELS);
  });

  it("crops the center to fill a box", () => {
    const plan = planResize(photo, { kind: "box", width: 1080, height: 1080, fit: "crop" });
    expect(plan?.size).toEqual({ width: 1080, height: 1080 });
    expect(plan?.source).toEqual({ x: 500, y: 0, width: 3000, height: 3000 });
    expect(plan?.padded).toBe(false);
  });

  it("fits inside a box with centered borders", () => {
    const plan = planResize(photo, { kind: "box", width: 1080, height: 1920, fit: "pad" });
    expect(plan?.size).toEqual({ width: 1080, height: 1920 });
    expect(plan?.target).toEqual({ x: 0, y: 555, width: 1080, height: 810 });
    expect(plan?.padded).toBe(true);
    // A small picture is enlarged to the box.
    expect(planResize({ width: 100, height: 100 }, { kind: "box", width: 800, height: 800, fit: "pad" })?.target.width).toBe(800);
  });

  it("has unique social presets with sane sizes", () => {
    expect(new Set(socialPresets.map((p) => p.id)).size).toBe(socialPresets.length);
    for (const p of socialPresets) expect(Math.max(p.width, p.height)).toBeLessThanOrEqual(2000);
  });
});
