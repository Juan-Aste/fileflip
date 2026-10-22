// Background removal around the U²-Net small model (u2netp, Apache-2.0):
// the photo is scaled to 320 × 320, the model returns how likely each pixel
// is to belong to the main subject, and that map, scaled back up, becomes
// the alpha channel. Pure functions: the worker does decoding and inference.

/** The model's input and output side. */
export const MODEL_SIDE = 320;
/** Photos above this are refused: the RGBA copy alone would take ~160 MB. */
export const MAX_PIXELS = 40_000_000;

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/** RGBA pixels of the photo scaled to MODEL_SIDE² → the model's normalized NCHW input. */
export function modelInput(rgba: Uint8ClampedArray | Uint8Array): Float32Array {
  const area = MODEL_SIDE * MODEL_SIDE;
  if (rgba.length !== area * 4) throw new Error("Wrong input size");
  // U²-Net divides by the brightest value of the image first (not by 255).
  let max = 0;
  for (let i = 0; i < rgba.length; i += 4) max = Math.max(max, rgba[i]!, rgba[i + 1]!, rgba[i + 2]!);
  const scale = max > 0 ? 1 / max : 0;
  const out = new Float32Array(area * 3);
  for (let p = 0; p < area; p++) {
    for (let c = 0; c < 3; c++) out[c * area + p] = (rgba[p * 4 + c]! * scale - MEAN[c]!) / STD[c]!;
  }
  return out;
}

/** The model's raw map → 0–255, stretched between its own minimum and maximum (as U²-Net does). */
export function normalizeMask(raw: Float32Array): Uint8Array {
  let min = Infinity;
  let max = -Infinity;
  for (const v of raw) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  const range = max - min;
  const out = new Uint8Array(raw.length);
  // A flat map means nothing stands out: keep the whole photo.
  if (!(range > 1e-6)) return out.fill(255);
  for (let i = 0; i < raw.length; i++) out[i] = Math.round(((raw[i]! - min) / range) * 255);
  return out;
}

/**
 * Faint values are noise from the background and near-certain ones are the
 * subject: they snap to 0 and 255, and the edge stays soft in between.
 */
const LOW = 10;
const HIGH = 245;
export const refineAlpha = (v: number) => (v <= LOW ? 0 : v >= HIGH ? 255 : Math.round(((v - LOW) / (HIGH - LOW)) * 255));

/** Bilinear sample of the MODEL_SIDE² mask at the center of pixel (x, y) of a width × height image. */
function sample(mask: Uint8Array, x: number, y: number, width: number, height: number): number {
  const fx = Math.min(Math.max(((x + 0.5) * MODEL_SIDE) / width - 0.5, 0), MODEL_SIDE - 1);
  const fy = Math.min(Math.max(((y + 0.5) * MODEL_SIDE) / height - 0.5, 0), MODEL_SIDE - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(x0 + 1, MODEL_SIDE - 1);
  const y1 = Math.min(y0 + 1, MODEL_SIDE - 1);
  const dx = fx - x0;
  const dy = fy - y0;
  const top = mask[y0 * MODEL_SIDE + x0]! * (1 - dx) + mask[y0 * MODEL_SIDE + x1]! * dx;
  const bottom = mask[y1 * MODEL_SIDE + x0]! * (1 - dx) + mask[y1 * MODEL_SIDE + x1]! * dx;
  return top * (1 - dy) + bottom * dy;
}

export type Background = { kind: "transparent" } | { kind: "color"; rgb: [number, number, number] };

/**
 * Applies the mask to the full-size photo in place: its alpha (kept where
 * the photo was already transparent) or, over a solid color, blends the
 * subject onto it and leaves the result opaque.
 */
export function applyMask(rgba: Uint8ClampedArray, width: number, height: number, mask: Uint8Array, background: Background) {
  if (rgba.length !== width * height * 4) throw new Error("Wrong image size");
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = (refineAlpha(sample(mask, x, y, width, height)) * rgba[i + 3]!) / 255;
      if (background.kind === "transparent") {
        rgba[i + 3] = alpha;
        continue;
      }
      const a = alpha / 255;
      for (let c = 0; c < 3; c++) rgba[i + c] = rgba[i + c]! * a + background.rgb[c]! * (1 - a);
      rgba[i + 3] = 255;
    }
  }
}

/** "#rrggbb" → [r, g, b]; anything else is white. */
export function parseHexColor(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : [255, 255, 255];
}
