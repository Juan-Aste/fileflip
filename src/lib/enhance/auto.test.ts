import { join } from "node:path";
import sharp, { type Sharp } from "sharp";
import { describe, expect, it } from "vitest";
import type { RawImage } from "@/lib/image/pixels";
import { autoEnhance, colorMaps, estimateNoise, levelMaps, levelPoints, lumaPlane, NOISE_FLOOR } from "./auto";
import { laplacianVariance, psnr } from "./metrics";

/** Deterministic pseudo-random numbers (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A scene with flat areas and hard edges: squares and stripes. */
function scene(width = 160, height = 120): Float32Array {
  const v = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let s = 0.3 + 0.4 * (x / width);
      if (x > 30 && x < 70 && y > 20 && y < 60) s = 0.85;
      if (x > 90 && y > 70 && Math.floor(x / 6) % 2 === 0) s = 0.1;
      v[y * width + x] = s;
    }
  }
  return v;
}

/** Washed out (values squeezed into 80–180), with a warm cast and Gaussian-ish noise. */
function degraded(noise: number, width = 160, height = 120): RawImage {
  const base = scene(width, height);
  const rand = rng(7);
  const data = new Uint8ClampedArray(width * height * 4);
  const gauss = () => (rand() + rand() + rand() + rand() - 2) * Math.sqrt(3);
  for (let p = 0; p < base.length; p++) {
    const v = 80 + base[p]! * 100;
    data[p * 4] = v * 1.12 + gauss() * noise;
    data[p * 4 + 1] = v + gauss() * noise;
    data[p * 4 + 2] = v * 0.82 + gauss() * noise;
    data[p * 4 + 3] = 255;
  }
  return { data, width, height };
}

const channelMeans = (img: RawImage) => {
  const m = [0, 0, 0];
  for (let i = 0; i < img.data.length; i += 4) for (let c = 0; c < 3; c++) m[c]! += img.data[i + c]!;
  return m.map((v) => v / (img.data.length / 4));
};

/** Standard deviation of the luma inside a flat rectangle. */
function flatStd(img: RawImage, x0: number, y0: number, x1: number, y1: number) {
  const g = lumaPlane(img);
  let s = 0;
  let s2 = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const v = g[y * img.width + x]!;
    s += v;
    s2 += v * v;
    n++;
  }
  return Math.sqrt(s2 / n - (s / n) ** 2);
}

describe("autoEnhance", () => {
  it("stretches a washed-out photo to a wider range", () => {
    const { image, report } = autoEnhance(degraded(2));
    const g = lumaPlane(image);
    const sorted = Array.from(g).sort((a, b) => a - b);
    const range = sorted[Math.floor(sorted.length * 0.99)]! - sorted[Math.floor(sorted.length * 0.01)]!;
    const before = lumaPlane(degraded(2));
    const sortedBefore = Array.from(before).sort((a, b) => a - b);
    const rangeBefore = sortedBefore[Math.floor(sortedBefore.length * 0.99)]! - sortedBefore[Math.floor(sortedBefore.length * 0.01)]!;
    expect(range).toBeGreaterThan(rangeBefore * 1.4);
    expect(report.levels[1]! - report.levels[0]!).toBeGreaterThanOrEqual(128);
  });

  it("reduces a color cast", () => {
    const input = degraded(2);
    // Cast = how far the brightest channel mean is above the darkest one, in relative terms.
    const cast = (m: number[]) => Math.max(...m) / Math.min(...m) - 1;
    const before = cast(channelMeans(input));
    const after = cast(channelMeans(autoEnhance(input).image));
    console.log("cast before/after", before.toFixed(3), after.toFixed(3));
    expect(before).toBeGreaterThan(0.3);
    expect(after).toBeLessThan(before * 0.6);
  });

  it("smooths noise in flat areas but keeps the edges sharp", () => {
    const input = degraded(8);
    const { image, report } = autoEnhance(input);
    expect(report.noise).toBeGreaterThan(5);
    expect(report.denoise).toBeGreaterThan(0);
    // Relative noise (std / contrast between two flat areas) must drop.
    const contrast = (img: RawImage) => {
      const g = lumaPlane(img);
      return g[40 * img.width + 50]! - g[100 * img.width + 10]!;
    };
    const relBefore = flatStd(input, 35, 25, 65, 55) / Math.abs(contrast(input));
    const relAfter = flatStd(image, 35, 25, 65, 55) / Math.abs(contrast(image));
    expect(relAfter).toBeLessThan(relBefore * 0.75);
    // Edge of the bright square: the step stays within 2 pixels.
    const g = lumaPlane(image);
    const row = 40 * image.width;
    expect(g[row + 33]! - g[row + 28]!).toBeGreaterThan(Math.abs(contrast(image)) * 0.3);
  });

  it("sharpens a clean photo (higher Laplacian variance) without denoising it", () => {
    const input = degraded(0.3);
    const { image, report } = autoEnhance(input);
    expect(report.denoise).toBe(0);
    expect(laplacianVariance(image)).toBeGreaterThan(laplacianVariance(input) * 1.5);
  });

  it("changes a well-exposed photo only moderately", async () => {
    const { data, info } = await sharp(join(process.cwd(), "tests/fixtures/people/person.jpg")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const input = { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
    const db = psnr(input, autoEnhance(input).image);
    console.log("person.jpg PSNR after auto", db.toFixed(1));
    expect(db).toBeGreaterThan(24);
    expect(db).toBeLessThan(60);
  });

  it("keeps alpha and size", async () => {
    const { data, info } = await sharp(join(process.cwd(), "tests/fixtures/photo-alpha.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const input = { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
    const { image } = autoEnhance(input);
    expect([image.width, image.height]).toEqual([input.width, input.height]);
    for (let i = 3; i < data.length; i += 4) expect(image.data[i]).toBe(data[i]);
  });

  it("handles tiny and fully transparent images", () => {
    const tiny = { data: new Uint8ClampedArray([10, 20, 30, 255]), width: 1, height: 1 };
    expect(autoEnhance(tiny).image.data.length).toBe(4);
    const clear = { data: new Uint8ClampedArray(4 * 9), width: 3, height: 3 };
    expect(levelPoints(clear)).toEqual([0, 255]);
    expect(colorMaps(clear)).toEqual([0, 1, 2].map(() => ({ gain: 1, offset: 0 })));
    expect(autoEnhance(clear).image.data.every((v) => v === 0)).toBe(true);
  });
});

describe("levels and color", () => {
  it("leaves a full-range photo alone and never stretches more than 2×", () => {
    for (const m of levelMaps([0, 1, 2].map(() => ({ gain: 1, offset: 0 })), [0, 255])) {
      expect(m.gain).toBeCloseTo(1);
      expect(m.offset).toBeCloseTo(0);
    }
    const gray = { data: new Uint8ClampedArray(4 * 100).map((_, i) => (i % 4 === 3 ? 255 : 120)), width: 10, height: 10 };
    const [black, white] = levelPoints(gray);
    expect(white - black).toBe(128);
    // A dark photo (0–60) is lifted to white 176, not to 255.
    const dark = { data: new Uint8ClampedArray(4 * 61), width: 61, height: 1 };
    for (let x = 0; x <= 60; x++) dark.data.set([x, x, x, 255], x * 4);
    expect(levelPoints(dark)).toEqual([0, 176]);
  });

  it("undoes much of a fade with a cast on a real photo", async () => {
    const file = join(process.cwd(), "tests/fixtures/people/person.jpg");
    const read = async (img: Sharp) => {
      const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
    };
    const original = await read(sharp(file));
    const faded = await read(sharp(file).linear([0.45, 0.4, 0.33], [80, 70, 60]));
    const balance = (img: RawImage) => {
      const m = channelMeans(img);
      const ref = channelMeans(original);
      const ratios = m.map((v, c) => v / ref[c]!);
      return Math.max(...ratios) / Math.min(...ratios) - 1;
    };
    const fixed = autoEnhance(faded).image;
    console.log("cast vs original", balance(faded).toFixed(3), "→", balance(fixed).toFixed(3), "PSNR", psnr(original, faded).toFixed(1), "→", psnr(original, fixed).toFixed(1));
    expect(balance(fixed)).toBeLessThan(balance(faded) * 0.7);
    expect(psnr(original, fixed)).toBeGreaterThan(psnr(original, faded) + 3);
  });
});

describe("estimateNoise", () => {
  it("measures added noise and ignores smooth gradients", () => {
    const w = 200;
    const h = 150;
    const rand = rng(3);
    const flat = new Float32Array(w * h);
    const noisy = new Float32Array(w * h);
    for (let p = 0; p < flat.length; p++) {
      flat[p] = (p % w) * 0.5;
      // Uniform noise of std 5: ±5√3.
      noisy[p] = flat[p]! + (rand() - 0.5) * 2 * 5 * Math.sqrt(3);
    }
    expect(estimateNoise(flat, w, h)).toBeLessThan(NOISE_FLOOR);
    expect(estimateNoise(noisy, w, h)).toBeGreaterThan(4);
    expect(estimateNoise(noisy, w, h)).toBeLessThan(6.5);
  });
});
