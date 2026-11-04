// Image measurements and reference resamplers for "Enhance photo": used by the
// tests as independent checks of the output, and by the upscaler (box
// downscale for x2, bilinear for the alpha channel).

import type { RawImage } from "@/lib/image/pixels";

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Variance of the 4-neighbor Laplacian of the luma: higher = sharper (more fine detail). */
export function laplacianVariance(image: RawImage): number {
  const { data, width, height } = image;
  const gray = new Float32Array(width * height);
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) gray[p] = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
  let sum = 0;
  let sum2 = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const v = gray[p - 1]! + gray[p + 1]! + gray[p - width]! + gray[p + width]! - 4 * gray[p]!;
      sum += v;
      sum2 += v * v;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sum2 / count - mean * mean;
}

/** Keys cubic kernel (a = -0.5), the usual "bicubic". */
function cubic(x: number) {
  const a = -0.5;
  const t = Math.abs(x);
  if (t <= 1) return (a + 2) * t * t * t - (a + 3) * t * t + 1;
  if (t < 2) return a * t * t * t - 5 * a * t * t + 8 * a * t - 4 * a;
  return 0;
}

/** Bicubic enlargement by an integer factor (all four channels), pixel centers aligned. */
export function bicubicUpscale(image: RawImage, scale: number): RawImage {
  const { data, width, height } = image;
  const w = width * scale;
  const h = height * scale;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = (y + 0.5) / scale - 0.5;
    const y0 = Math.floor(sy);
    const wy = [cubic(sy - (y0 - 1)), cubic(sy - y0), cubic(sy - (y0 + 1)), cubic(sy - (y0 + 2))];
    for (let x = 0; x < w; x++) {
      const sx = (x + 0.5) / scale - 0.5;
      const x0 = Math.floor(sx);
      const wx = [cubic(sx - (x0 - 1)), cubic(sx - x0), cubic(sx - (x0 + 1)), cubic(sx - (x0 + 2))];
      for (let c = 0; c < 4; c++) {
        let s = 0;
        for (let j = 0; j < 4; j++) {
          const row = clamp(y0 - 1 + j, 0, height - 1) * width;
          for (let i = 0; i < 4; i++) s += wy[j]! * wx[i]! * data[(row + clamp(x0 - 1 + i, 0, width - 1)) * 4 + c]!;
        }
        out[(y * w + x) * 4 + c] = s;
      }
    }
  }
  return { data: out, width: w, height: h };
}

/** Halves an image by averaging 2 × 2 blocks (exact, no aliasing); odd edges keep their last row/column. */
export function halve(image: RawImage): RawImage {
  const { data, width, height } = image;
  const w = Math.max(1, Math.floor(width / 2));
  const h = Math.max(1, Math.floor(height / 2));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.min(height - 1, y * 2);
    const y1 = Math.min(height - 1, y * 2 + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.min(width - 1, x * 2);
      const x1 = Math.min(width - 1, x * 2 + 1);
      for (let c = 0; c < 4; c++) {
        out[(y * w + x) * 4 + c] =
          (data[(y0 * width + x0) * 4 + c]! + data[(y0 * width + x1) * 4 + c]! + data[(y1 * width + x0) * 4 + c]! + data[(y1 * width + x1) * 4 + c]! + 2) >> 2;
      }
    }
  }
  return { data: out, width: w, height: h };
}

/** Area-average downscale by an integer factor (for test fixtures: a sharp photo made small). */
export function downscale(image: RawImage, factor: number): RawImage {
  const { data, width, height } = image;
  const w = Math.floor(width / factor);
  const h = Math.floor(height / factor);
  const out = new Uint8ClampedArray(w * h * 4);
  const area = factor * factor;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 4; c++) {
        let s = 0;
        for (let j = 0; j < factor; j++) for (let i = 0; i < factor; i++) s += data[((y * factor + j) * width + x * factor + i) * 4 + c]!;
        out[(y * w + x) * 4 + c] = s / area;
      }
    }
  }
  return { data: out, width: w, height: h };
}

/** Peak signal-to-noise ratio (dB) over RGB of two same-sized images. */
export function psnr(a: RawImage, b: RawImage): number {
  if (a.width !== b.width || a.height !== b.height) throw new Error("size mismatch");
  let se = 0;
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = a.data[i + c]! - b.data[i + c]!;
      se += d * d;
      n++;
    }
  }
  return se === 0 ? Infinity : 10 * Math.log10((255 * 255) / (se / n));
}
