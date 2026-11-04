// "Round image": rounded corners or a circle/ellipse cut, with an
// antialiased edge. Pure functions (the image-tools worker runs them); the
// preview draws the same shape with a canvas path from `roundPlan`.
import type { RawImage } from "./pixels";

export interface Corners {
  tl: boolean;
  tr: boolean;
  br: boolean;
  bl: boolean;
}

export type RoundSpec =
  | { shape: "corners"; radius: number; unit: "px" | "percent"; corners: Corners }
  /** Circle: a centered square crop, moved along the long side by `focus` (0–1). Ellipse: the whole image. */
  | { shape: "circle"; ellipse: boolean; focus: number };

export type RoundFill = { kind: "transparent" } | { kind: "color"; rgb: [number, number, number] };

export interface RoundPlan {
  /** Part of the image kept (the square of a circle, else everything). */
  crop: { x: number; y: number; width: number; height: number };
  /** Corner radius in pixels of the output (corners mode). */
  radius: number;
}

/** Radius as a share (%) of the shorter side, up to 50 %. */
export const MAX_RADIUS_PERCENT = 50;

export function roundPlan(width: number, height: number, spec: RoundSpec): RoundPlan {
  if (spec.shape === "circle" && !spec.ellipse) {
    const side = Math.min(width, height);
    const focus = Math.min(1, Math.max(0, spec.focus));
    return {
      crop: { x: Math.round((width - side) * focus), y: Math.round((height - side) * focus), width: side, height: side },
      radius: side / 2,
    };
  }
  const short = Math.min(width, height);
  const radius = spec.shape === "corners" ? Math.min(short / 2, Math.max(0, spec.unit === "percent" ? (spec.radius / 100) * short : spec.radius)) : 0;
  return { crop: { x: 0, y: 0, width, height }, radius };
}

/** Share of pixel (x, y) inside the shape (0–1), from the signed distance to its edge. */
function coverageAt(x: number, y: number, w: number, h: number, spec: RoundSpec, radius: number): number {
  const px = x + 0.5;
  const py = y + 0.5;
  if (spec.shape === "circle") {
    const a = w / 2;
    const b = h / 2;
    const dx = px - a;
    const dy = py - b;
    const f = (dx * dx) / (a * a) + (dy * dy) / (b * b) - 1;
    // Quick exits away from the edge.
    if (f < -0.25) return 1;
    const g = 2 * Math.hypot(dx / (a * a), dy / (b * b));
    const d = g === 0 ? 1 : -f / g;
    return Math.min(1, Math.max(0, d + 0.5));
  }
  const r = radius;
  if (r <= 0) return 1;
  const { tl, tr, br, bl } = spec.corners;
  let cx: number | null = null;
  let cy = 0;
  if (px < r && py < r && tl) [cx, cy] = [r, r];
  else if (px > w - r && py < r && tr) [cx, cy] = [w - r, r];
  else if (px > w - r && py > h - r && br) [cx, cy] = [w - r, h - r];
  else if (px < r && py > h - r && bl) [cx, cy] = [r, h - r];
  if (cx === null) return 1;
  const d = r - Math.hypot(px - cx, py - cy);
  return Math.min(1, Math.max(0, d + 0.5));
}

/**
 * The rounded image: outside the shape transparent (alpha 0) or the fill
 * color; inside, the original pixels untouched; the edge antialiased.
 */
export function roundImage(image: RawImage, spec: RoundSpec, fill: RoundFill): RawImage {
  const { crop, radius } = roundPlan(image.width, image.height, spec);
  const w = crop.width;
  const h = crop.height;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = ((crop.y + y) * image.width + crop.x) * 4;
    out.set(image.data.subarray(row, row + w * 4), y * w * 4);
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = coverageAt(x, y, w, h, spec, radius);
      const i = (y * w + x) * 4;
      if (fill.kind === "transparent") {
        if (c < 1) out[i + 3] = Math.round(out[i + 3]! * c);
        continue;
      }
      // Over a color: blend what shows of the photo (its own alpha too), opaque.
      const a = (c * out[i + 3]!) / 255;
      if (a === 1) continue;
      for (let k = 0; k < 3; k++) out[i + k] = Math.round(out[i + k]! * a + fill.rgb[k]! * (1 - a));
      out[i + 3] = 255;
    }
  return { data: out, width: w, height: h };
}
