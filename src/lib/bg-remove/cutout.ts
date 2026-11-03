// From the GrabCut mask (computed on a reduced copy of the photo) to the
// final image: a soft edge, scaled back to the original size, applied as
// alpha or over a solid color. Pure functions; the worker does the I/O.

import { buildTrimap, grabCut, type Rect, type Stroke } from "./grabcut";
import { applyPaint, type PaintStroke } from "./paint";

/** Longest side of the copy GrabCut works on: big enough for clean edges, small enough to answer at once. */
export const WORK_SIDE = 480;
/** Photos above this are refused: the RGBA copy alone would take ~160 MB. */
export const MAX_PIXELS = 40_000_000;

/** The editor's copy: sharp enough to zoom in on, small enough to repaint parts of it at once. */
export const VIEW_MAX_PIXELS = 3_000_000;

export function viewSize(width: number, height: number) {
  const scale = Math.min(1, Math.sqrt(VIEW_MAX_PIXELS / (width * height)));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function workSize(width: number, height: number, side = WORK_SIDE) {
  const scale = Math.min(1, side / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Area-average downscale of RGBA pixels (exact for any ratio). */
export function downscale(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number, tw: number, th: number): Uint8ClampedArray {
  if (tw === width && th === height) return new Uint8ClampedArray(rgba);
  const out = new Uint8ClampedArray(tw * th * 4);
  const sx = width / tw;
  const sy = height / th;
  const acc = new Float64Array(4);
  for (let ty = 0; ty < th; ty++) {
    const y0 = ty * sy;
    const y1 = y0 + sy;
    for (let tx = 0; tx < tw; tx++) {
      const x0 = tx * sx;
      const x1 = x0 + sx;
      acc.fill(0);
      let area = 0;
      for (let y = Math.floor(y0); y < Math.min(height, Math.ceil(y1)); y++) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0);
        for (let x = Math.floor(x0); x < Math.min(width, Math.ceil(x1)); x++) {
          const w = (Math.min(x + 1, x1) - Math.max(x, x0)) * wy;
          const i = (y * width + x) * 4;
          for (let c = 0; c < 4; c++) acc[c] += rgba[i + c]! * w;
          area += w;
        }
      }
      const o = (ty * tw + tx) * 4;
      for (let c = 0; c < 4; c++) out[o + c] = acc[c]! / area;
    }
  }
  return out;
}

/**
 * Binary mask (0/1) → 0–255 with a soft edge: a small separable blur
 * (radius in work pixels), so the cut does not look jagged once scaled up.
 */
export function softMask(mask: Uint8Array, width: number, height: number, radius = 1): Uint8Array {
  const r = Math.max(0, Math.round(radius));
  const src = Float32Array.from(mask, (v) => v * 255);
  if (r === 0) return Uint8Array.from(src);
  const kernel: number[] = [];
  const sigma = Math.max(0.5, r / 1.5);
  for (let k = -r; k <= r; k++) kernel.push(Math.exp(-(k * k) / (2 * sigma * sigma)));
  const sum = kernel.reduce((a, b) => a + b, 0);
  const tmp = new Float32Array(src.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let k = -r; k <= r; k++) v += src[y * width + Math.min(width - 1, Math.max(0, x + k))]! * kernel[k + r]!;
      tmp[y * width + x] = v / sum;
    }
  const out = new Uint8Array(src.length);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (let k = -r; k <= r; k++) v += tmp[Math.min(height - 1, Math.max(0, y + k)) * width + x]! * kernel[k + r]!;
      out[y * width + x] = Math.round(v / sum);
    }
  return out;
}

/** Bilinear sample of a mw × mh mask at the center of pixel (x, y) of a width × height image. */
function sample(mask: Uint8Array, mw: number, mh: number, x: number, y: number, width: number, height: number): number {
  const fx = Math.min(Math.max(((x + 0.5) * mw) / width - 0.5, 0), mw - 1);
  const fy = Math.min(Math.max(((y + 0.5) * mh) / height - 0.5, 0), mh - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(x0 + 1, mw - 1);
  const y1 = Math.min(y0 + 1, mh - 1);
  const dx = fx - x0;
  const dy = fy - y0;
  const top = mask[y0 * mw + x0]! * (1 - dx) + mask[y0 * mw + x1]! * dx;
  const bottom = mask[y1 * mw + x0]! * (1 - dx) + mask[y1 * mw + x1]! * dx;
  return top * (1 - dy) + bottom * dy;
}

/** Scaling up widens the blur: stretch the edge back to about one original pixel per work pixel. */
export const sharpenAlpha = (v: number) => Math.min(255, Math.max(0, Math.round((v - 127.5) * 1.6 + 127.5)));

export type Background = { kind: "transparent" } | { kind: "color"; rgb: [number, number, number] };

/**
 * Alpha of a width × height plane showing the photo, from the soft mask
 * (mw × mh) and the photo's own alpha there (`own`, 255 when opaque).
 */
export function cutAlpha(mask: Uint8Array, mw: number, mh: number, width: number, height: number, own: (p: number) => number): Uint8Array {
  if (mask.length !== mw * mh) throw new Error("Wrong mask size");
  const alpha = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      alpha[p] = Math.round((sharpenAlpha(sample(mask, mw, mh, x, y, width, height)) * own(p)) / 255);
    }
  return alpha;
}

/**
 * Applies the soft mask (mw × mh) and the "erase"/"restore" strokes to the
 * full-size photo in place: as alpha (kept where the photo was already
 * transparent) or blended over a solid color, opaque.
 */
export function applyMask(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  mask: Uint8Array,
  mw: number,
  mh: number,
  background: Background,
  paint: readonly PaintStroke[] = [],
) {
  if (rgba.length !== width * height * 4) throw new Error("Wrong image size");
  const own = (p: number) => rgba[p * 4 + 3]!;
  const alpha = cutAlpha(mask, mw, mh, width, height, own);
  if (paint.length) applyPaint(alpha, own, width, height, 1, paint);
  for (let p = 0; p < alpha.length; p++) {
    const i = p * 4;
    if (background.kind === "transparent") {
      rgba[i + 3] = alpha[p]!;
      continue;
    }
    const a = alpha[p]! / 255;
    for (let c = 0; c < 3; c++) rgba[i + c] = rgba[i + c]! * a + background.rgb[c]! * (1 - a);
    rgba[i + 3] = 255;
  }
}

/** "#rrggbb" → [r, g, b]; anything else is white. */
export function parseHexColor(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : [255, 255, 255];
}

/** Intersection over union of two binary masks (alpha ≥ 128 counts as kept). */
export function iou(a: ArrayLike<number>, b: ArrayLike<number>, threshold = 128): number {
  let inter = 0;
  let union = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]! >= threshold;
    const y = b[i]! >= threshold;
    if (x && y) inter++;
    if (x || y) union++;
  }
  return union === 0 ? 1 : inter / union;
}

/** Rectangle and strokes (in work pixels) → soft mask of the work copy. */
export function segment(work: Uint8ClampedArray | Uint8Array, width: number, height: number, rect: Rect, strokes: readonly Stroke[], iterations = 4) {
  const trimap = buildTrimap(width, height, rect, strokes);
  return softMask(grabCut(work, width, height, trimap, iterations), width, height, 1);
}
