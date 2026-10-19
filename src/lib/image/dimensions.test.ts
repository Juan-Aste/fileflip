import { describe, expect, it } from "vitest";
import { computeSize, coverCrop, MAX_SIDE } from "./dimensions";

const photo = { width: 4000, height: 3000 };

describe("computeSize", () => {
  it("keeps the original size by default", () => {
    expect(computeSize(photo, { mode: "none" })).toEqual(photo);
  });

  it("scales by percentage and rounds", () => {
    expect(computeSize(photo, { mode: "percent", percent: 50 })).toEqual({ width: 2000, height: 1500 });
    expect(computeSize({ width: 3, height: 3 }, { mode: "percent", percent: 50 })).toEqual({ width: 2, height: 2 });
  });

  it("fits inside a box keeping the aspect ratio", () => {
    expect(computeSize(photo, { mode: "fit", width: 1000, height: 1000 })).toEqual({ width: 1000, height: 750 });
    expect(computeSize(photo, { mode: "fit", height: 600 })).toEqual({ width: 800, height: 600 });
    expect(computeSize(photo, { mode: "fit", width: 1920 })).toEqual({ width: 1920, height: 1440 });
  });

  it("never upscales when fitting", () => {
    expect(computeSize({ width: 800, height: 600 }, { mode: "fit", width: 1920 })).toEqual({ width: 800, height: 600 });
  });

  it("upscales vector sources when asked", () => {
    expect(computeSize({ width: 24, height: 12 }, { mode: "fit", width: 480 }, { upscale: true })).toEqual({
      width: 480,
      height: 240,
    });
  });

  it("ignores empty or invalid box sides", () => {
    expect(computeSize(photo, { mode: "fit" })).toEqual(photo);
    expect(computeSize(photo, { mode: "fit", width: 0, height: -5 })).toEqual(photo);
  });

  it("never returns a zero or huge side", () => {
    expect(computeSize({ width: 1000, height: 1 }, { mode: "fit", width: 10 })).toEqual({ width: 10, height: 1 });
    expect(computeSize({ width: 8000, height: 4000 }, { mode: "percent", percent: 400 })).toEqual({
      width: MAX_SIDE,
      height: MAX_SIDE / 2,
    });
  });
});

describe("cover", () => {
  it("always returns the exact size, even when upscaling", () => {
    expect(computeSize(photo, { mode: "cover", width: 472, height: 472 })).toEqual({ width: 472, height: 472 });
    expect(computeSize({ width: 100, height: 50 }, { mode: "cover", width: 400, height: 400 })).toEqual({
      width: 400,
      height: 400,
    });
  });

  it("crops the center of the source to the target ratio", () => {
    expect(coverCrop(photo, { width: 472, height: 472 })).toEqual({ x: 500, y: 0, width: 3000, height: 3000 });
    expect(coverCrop({ width: 300, height: 600 }, { width: 300, height: 300 })).toEqual({ x: 0, y: 150, width: 300, height: 300 });
  });
});
