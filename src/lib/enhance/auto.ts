// "Enhance photo", automatic mode: classic filters only, no trained model.
// In order: color correction (each channel's black and white points brought
// toward the common ones), levels (one stretch for all channels), a midtone correction, a
// mild edge-preserving noise reduction sized to the noise measured in the
// photo, and unsharp masking on the luminance. Every step is limited so an already good photo changes little.

import type { RawImage } from "@/lib/image/pixels";

export interface AutoEnhanceReport {
  /** Color correction per channel (R, G, B): out = in × gain + offset. */
  color: { gain: number; offset: number }[];
  /** Black and white points of the levels stretch, 0–255. */
  levels: [number, number];
  /** Gamma applied to all channels (1 = none). */
  gamma: number;
  /** Noise measured before the reduction (standard deviation, 0–255 scale). */
  noise: number;
  /** Range sigma of the bilateral filter (0 = skipped). */
  denoise: number;
  /** Unsharp mask amount. */
  sharpen: number;
}

/** Rec. 601 luma, the weights used across the steps. */
const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Ignore pixels that are mostly transparent: their color is meaningless. */
const visible = (data: Uint8ClampedArray, i: number) => data[i + 3]! >= 128;

/** Value at a fraction of a 256-bin histogram. */
function percentile(hist: Uint32Array, total: number, fraction: number) {
  const target = total * fraction;
  let sum = 0;
  for (let v = 0; v < 256; v++) {
    sum += hist[v]!;
    if (sum > target) return v;
  }
  return 255;
}

/** How much of the per-channel alignment is applied (1 = all). */
export const COLOR_STRENGTH = 0.8;

/**
 * Color correction: per-channel linear maps (out = in × gain + offset) that
 * bring each channel's black and white points (0.5 % / 99.5 %) to the average
 * of the three. A cast from the light or a faded print shifts and scales the
 * channels differently, so their points split apart; aligning them undoes
 * that. Applied at COLOR_STRENGTH with the gain limited to 0.6–1.6, so a
 * scene that really lacks a color (a sunset) is not turned gray.
 */
export function colorMaps(image: RawImage): { gain: number; offset: number }[] {
  const hists = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  const { data } = image;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (!visible(data, i)) continue;
    hists[0]![data[i]!]!++;
    hists[1]![data[i + 1]!]!++;
    hists[2]![data[i + 2]!]!++;
    total++;
  }
  if (total === 0) return [0, 1, 2].map(() => ({ gain: 1, offset: 0 }));
  const points = hists.map((h) => {
    const lo = percentile(h, total, 0.005);
    return [lo, Math.max(percentile(h, total, 0.995), lo + 1)] as const;
  });
  const lo = points.reduce((sum, p) => sum + p[0], 0) / 3;
  const hi = points.reduce((sum, p) => sum + p[1], 0) / 3;
  return points.map(([l, h]) => {
    const g = clamp((hi - lo) / (h - l), 0.6, 1.6);
    // Full alignment: v → lo + (v − l) × g; blended with the identity.
    return { gain: 1 - COLOR_STRENGTH + COLOR_STRENGTH * g, offset: COLOR_STRENGTH * (lo - l * g) };
  });
}

const identity = [0, 1, 2].map(() => ({ gain: 1, offset: 0 }));

/**
 * Black and white points of the luma (0.3 % / 99.7 % of the visible pixels),
 * limited so a dark or bright photo is not forced to full range (black ≤ 64,
 * white ≥ 176) and the stretch is never more than 2×.
 */
export function levelPoints(image: RawImage, color: readonly { gain: number; offset: number }[] = identity): [number, number] {
  const hist = new Uint32Array(256);
  const { data } = image;
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (!visible(data, i)) continue;
    const [r, g, b] = color.map((m, c) => clamp(data[i + c]! * m.gain + m.offset, 0, 255));
    hist[Math.round(luma(r!, g!, b!))]!++;
    total++;
  }
  if (total === 0) return [0, 255];
  let black = Math.min(percentile(hist, total, 0.003), 64);
  let white = Math.max(percentile(hist, total, 0.997), 176);
  if (white - black < 128) {
    const mid = (white + black) / 2;
    black = Math.max(0, mid - 64);
    white = Math.min(255, mid + 64);
  }
  return [black, white];
}

/** Per-channel linear maps (out = in × gain + offset): the color correction, then the shared levels stretch. */
export function levelMaps(color: readonly { gain: number; offset: number }[], [black, white]: readonly [number, number]): { gain: number; offset: number }[] {
  const stretch = 255 / (white - black);
  return color.map((m) => ({ gain: m.gain * stretch, offset: (m.offset - black) * stretch }));
}

/** Fast noise estimate (Immerkær 1996): mean absolute response of a Laplacian-difference kernel on the luma. */
export function estimateNoise(gray: Float32Array, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  for (let y = 1; y < height - 1; y++) {
    const r0 = (y - 1) * width;
    const r1 = y * width;
    const r2 = (y + 1) * width;
    for (let x = 1; x < width - 1; x++) {
      const v =
        gray[r0 + x - 1]! - 2 * gray[r0 + x]! + gray[r0 + x + 1]! -
        2 * gray[r1 + x - 1]! + 4 * gray[r1 + x]! - 2 * gray[r1 + x + 1]! +
        gray[r2 + x - 1]! - 2 * gray[r2 + x]! + gray[r2 + x + 1]!;
      sum += Math.abs(v);
    }
  }
  return (Math.sqrt(Math.PI / 2) * sum) / (6 * (width - 2) * (height - 2));
}

/** Luma of every pixel. */
export function lumaPlane(image: RawImage): Float32Array {
  const { data, width, height } = image;
  const out = new Float32Array(width * height);
  for (let p = 0, i = 0; p < out.length; p++, i += 4) out[p] = luma(data[i]!, data[i + 1]!, data[i + 2]!);
  return out;
}

/** Separable Gaussian blur of one plane (edges clamped). */
export function gaussianBlur(src: Float32Array, width: number, height: number, sigma: number): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 2.5));
  const kernel = new Float32Array(radius * 2 + 1);
  let norm = 0;
  for (let k = -radius; k <= radius; k++) norm += kernel[k + radius] = Math.exp(-(k * k) / (2 * sigma * sigma));
  for (let k = 0; k < kernel.length; k++) kernel[k]! /= norm;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let s = 0;
      for (let k = -radius; k <= radius; k++) s += kernel[k + radius]! * src[row + clamp(x + k, 0, width - 1)]!;
      tmp[row + x] = s;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let s = 0;
      for (let k = -radius; k <= radius; k++) s += kernel[k + radius]! * tmp[clamp(y + k, 0, height - 1) * width + x]!;
      out[y * width + x] = s;
    }
  }
  return out;
}

/**
 * 5 × 5 bilateral filter on RGB, with the range weight taken from the luma
 * difference (so edges and color borders survive) and a spatial sigma of 1.2 px.
 */
function bilateral(rgb: Float32Array, gray: Float32Array, width: number, height: number, sigmaRange: number) {
  const out = new Float32Array(rgb.length);
  const spatial = new Float32Array(25);
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) spatial[(dy + 2) * 5 + dx + 2] = Math.exp(-(dx * dx + dy * dy) / (2 * 1.2 * 1.2));
  // Range weights by integer luma difference, looked up instead of exp() per tap.
  const range = new Float32Array(256);
  for (let d = 0; d < 256; d++) range[d] = Math.exp(-(d * d) / (2 * sigmaRange * sigmaRange));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const center = gray[p]!;
      let wsum = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let dy = -2; dy <= 2; dy++) {
        const yy = clamp(y + dy, 0, height - 1) * width;
        for (let dx = -2; dx <= 2; dx++) {
          const q = yy + clamp(x + dx, 0, width - 1);
          const w = spatial[(dy + 2) * 5 + dx + 2]! * range[Math.min(255, Math.abs(gray[q]! - center) | 0)]!;
          wsum += w;
          r += w * rgb[q * 3]!;
          g += w * rgb[q * 3 + 1]!;
          b += w * rgb[q * 3 + 2]!;
        }
      }
      out[p * 3] = r / wsum;
      out[p * 3 + 1] = g / wsum;
      out[p * 3 + 2] = b / wsum;
    }
  }
  return out;
}

/** Noise below this (0–255 scale) is left alone: smoothing it would only soften detail. */
export const NOISE_FLOOR = 1.5;

/** Automatic enhancement; alpha is kept as is. */
export function autoEnhance(image: RawImage): { image: RawImage; report: AutoEnhanceReport } {
  const { data, width, height } = image;
  const n = width * height;

  // 1. Levels per channel.
  const color = colorMaps(image);
  const levels = levelPoints(image, color);
  const maps = levelMaps(color, levels);
  const rgb = new Float32Array(n * 3);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    for (let c = 0; c < 3; c++) rgb[p * 3 + c] = clamp(data[i + c]! * maps[c]!.gain + maps[c]!.offset, 0, 255);
  }

  // 2. Midtones: move the mean luma halfway toward 0.47 with a gamma in [0.8, 1.25].
  let sumL = 0;
  let count = 0;
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    if (!visible(data, i)) continue;
    sumL += luma(rgb[p * 3]!, rgb[p * 3 + 1]!, rgb[p * 3 + 2]!);
    count++;
  }
  const meanL = count > 0 ? clamp(sumL / count / 255, 0.02, 0.98) : 0.47;
  const fullGamma = Math.log(0.47) / Math.log(meanL);
  const gamma = clamp(1 + (fullGamma - 1) * 0.5, 0.8, 1.25);
  if (Math.abs(gamma - 1) > 0.01) {
    const lut = new Float32Array(256);
    for (let v = 0; v < 256; v++) lut[v] = 255 * Math.pow(v / 255, gamma);
    for (let k = 0; k < rgb.length; k++) {
      // Linear interpolation in the table keeps the float precision.
      const v = rgb[k]!;
      const lo = Math.min(254, v | 0);
      rgb[k] = lut[lo]! + (lut[lo + 1]! - lut[lo]!) * (v - lo);
    }
  }

  // 3. Noise reduction, only when the photo has measurable noise.
  const gray = new Float32Array(n);
  for (let p = 0; p < n; p++) gray[p] = luma(rgb[p * 3]!, rgb[p * 3 + 1]!, rgb[p * 3 + 2]!);
  const noise = estimateNoise(gray, width, height);
  let denoise = 0;
  let current = rgb;
  if (noise > NOISE_FLOOR) {
    denoise = clamp(noise * 2.5, 4, 30);
    current = bilateral(rgb, gray, width, height, denoise);
    for (let p = 0; p < n; p++) gray[p] = luma(current[p * 3]!, current[p * 3 + 1]!, current[p * 3 + 2]!);
  }

  // 4. Unsharp mask on the luma (no color fringes); gentler on noisy photos, ignores tiny differences.
  const sharpen = noise > 6 ? 0.35 : 0.6;
  const blurred = gaussianBlur(gray, width, height, 1);
  const threshold = 2;
  const out = new Uint8ClampedArray(data.length);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const detail = gray[p]! - blurred[p]!;
    const delta = Math.abs(detail) > threshold ? sharpen * detail : 0;
    out[i] = current[p * 3]! + delta;
    out[i + 1] = current[p * 3 + 1]! + delta;
    out[i + 2] = current[p * 3 + 2]! + delta;
    out[i + 3] = data[i + 3]!;
  }
  return { image: { data: out, width, height }, report: { color, levels, gamma, noise, denoise, sharpen } };
}
