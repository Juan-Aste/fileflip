import { describe, expect, it } from "vitest";
import { MIN_SIDE, fitToTarget, minScaleFor, savedFraction, targetFormat } from "./compress";

/** Fake encoder: size grows with quality and with the pixel count. */
const fake = (bytesAtFull: (quality: number) => number) => {
  const calls: { quality: number; scale: number }[] = [];
  const encodeAt = async (quality: number, scale: number) => {
    calls.push({ quality, scale });
    return new ArrayBuffer(Math.round(bytesAtFull(quality) * scale * scale));
  };
  return { encodeAt, calls };
};

describe("fitToTarget", () => {
  it("returns the highest quality that fits", async () => {
    const { encodeAt, calls } = fake((q) => q * 1000);
    const fit = await fitToTarget(encodeAt, 70_500);
    expect(fit?.quality).toBe(70);
    expect(fit?.scale).toBe(1);
    expect(fit!.bytes.byteLength).toBeLessThanOrEqual(70_500);
    // Binary search: a handful of encodes, not one per quality.
    expect(calls.length).toBeLessThanOrEqual(9);
  });

  it("caps the quality at 92 when everything fits", async () => {
    const { encodeAt } = fake((q) => q);
    expect((await fitToTarget(encodeAt, 1_000_000))?.quality).toBe(92);
  });

  it("shrinks the image when a modest quality is still too big", async () => {
    const { encodeAt, calls } = fake((q) => 100_000 + q * 10_000); // q40 → 500 KB
    const fit = await fitToTarget(encodeAt, 200_000);
    expect(fit).not.toBeNull();
    expect(fit!.scale).toBeLessThan(1);
    expect(fit!.quality).toBeGreaterThanOrEqual(40);
    expect(fit!.bytes.byteLength).toBeLessThanOrEqual(200_000);
    expect(calls.some((c) => c.scale < 1)).toBe(true);
  });

  it("goes below quality 40 only at the smallest allowed size", async () => {
    const { encodeAt } = fake((q) => 100_000 + q * 10_000);
    const fit = await fitToTarget(encodeAt, 40_000, { minScale: 0.5 });
    expect(fit).not.toBeNull();
    expect(fit!.scale).toBe(0.5);
    expect(fit!.quality).toBeLessThan(40);
    expect(fit!.bytes.byteLength).toBeLessThanOrEqual(40_000);
  });

  it("gives up when the target can't be met above the minimum scale", async () => {
    const { encodeAt } = fake(() => 1_000_000);
    expect(await fitToTarget(encodeAt, 10_000, { minScale: 0.5 })).toBeNull();
  });

  it("reports each encode as a step", async () => {
    const { encodeAt, calls } = fake((q) => q * 1000);
    const steps: number[] = [];
    await fitToTarget(encodeAt, 50_000, { onStep: (s) => steps.push(s) });
    expect(steps).toEqual(calls.map((_, i) => i + 1));
  });
});

describe("compression helpers", () => {
  it("turns PNG into JPG in target mode and keeps other formats", () => {
    expect(targetFormat("png", "same")).toBe("jpg");
    expect(targetFormat("png", "webp")).toBe("webp");
    expect(targetFormat("webp", "same")).toBe("webp");
    expect(targetFormat("jpg", "png")).toBe("jpg");
  });

  it("never shrinks below the minimum side", () => {
    expect(minScaleFor(1600, 800)).toBe(MIN_SIDE / 1600);
    expect(minScaleFor(100, 50)).toBe(1);
  });

  it("computes the saved fraction", () => {
    expect(savedFraction(1000, 250)).toBe(0.75);
    expect(savedFraction(0, 10)).toBe(0);
  });
});
