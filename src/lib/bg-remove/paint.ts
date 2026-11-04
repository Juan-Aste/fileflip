// Direct "erase" and "restore" brushes of the background editor: unlike the
// "keep"/"remove" marks (hints for GrabCut, which recomputes the whole cut),
// these change exactly the pixels under the brush, on top of the cut. Strokes
// are kept in original-image pixels and rasterized at any scale: the preview
// (a reduced copy) and the download (full size) use the same functions.

export type PaintKind = "erase" | "restore";

export interface PaintStroke {
  kind: PaintKind;
  /** Brush radius in original pixels. */
  radius: number;
  /** Soft: the edge fades over the outer half of the radius; hard: one pixel of antialiasing. */
  soft: boolean;
  points: readonly (readonly [number, number])[];
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Bounding box of a stroke in original pixels (inclusive of the brush). */
export function strokeBox(s: PaintStroke): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of s.points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  const r = s.radius + 1;
  return { x0: x0 - r, y0: y0 - r, x1: x1 + r, y1: y1 + r };
}

export const intersects = (a: Box, b: Box) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;

/** Squared distance from (px, py) to the segment a–b. */
function segDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  const x = ax + dx * t - px;
  const y = ay + dy * t - py;
  return x * x + y * y;
}

/** How much the brush covers the point (0–1), from its distance to the stroke. */
export function coverage(s: PaintStroke, px: number, py: number): number {
  const pts = s.points;
  if (pts.length === 0) return 0;
  const reach = s.radius + 1;
  let best = Infinity;
  if (pts.length === 1) best = (px - pts[0]![0]) ** 2 + (py - pts[0]![1]) ** 2;
  for (let k = 1; k < pts.length && best > 0; k++) {
    const [ax, ay] = pts[k - 1]!;
    const [bx, by] = pts[k]!;
    // Skip segments too far away (cheap box test).
    if (px < Math.min(ax, bx) - reach || px > Math.max(ax, bx) + reach || py < Math.min(ay, by) - reach || py > Math.max(ay, by) + reach) continue;
    best = Math.min(best, segDist2(px, py, ax, ay, bx, by));
  }
  if (best === Infinity) return 0;
  const d = Math.sqrt(best);
  if (s.soft) {
    const inner = s.radius * 0.5;
    if (d <= inner) return 1;
    if (d >= s.radius) return 0;
    const t = (s.radius - d) / (s.radius - inner);
    return t * t * (3 - 2 * t);
  }
  return Math.max(0, Math.min(1, s.radius + 0.5 - d));
}

/**
 * Applies strokes to an alpha plane of `width` × `height` pixels that shows
 * the original image at `scale` (plane pixels per original pixel). `alpha`
 * holds the cut and is changed in place; `full` is each pixel's alpha with
 * nothing removed (what "restore" brings back). Only pixels inside `region`
 * (plane pixels, inclusive) are touched when it is given.
 */
export function applyPaint(
  alpha: Uint8Array | Uint8ClampedArray,
  full: (p: number) => number,
  width: number,
  height: number,
  scale: number,
  strokes: readonly PaintStroke[],
  region?: Box,
) {
  for (const s of strokes) {
    const b = strokeBox(s);
    let x0 = Math.max(0, Math.floor(b.x0 * scale));
    let y0 = Math.max(0, Math.floor(b.y0 * scale));
    let x1 = Math.min(width - 1, Math.ceil(b.x1 * scale));
    let y1 = Math.min(height - 1, Math.ceil(b.y1 * scale));
    if (region) {
      x0 = Math.max(x0, region.x0);
      y0 = Math.max(y0, region.y0);
      x1 = Math.min(x1, region.x1);
      y1 = Math.min(y1, region.y1);
    }
    for (let y = y0; y <= y1; y++) {
      const oy = (y + 0.5) / scale;
      for (let x = x0; x <= x1; x++) {
        const c = coverage(s, (x + 0.5) / scale, oy);
        if (c <= 0) continue;
        const p = y * width + x;
        const a = alpha[p]!;
        alpha[p] = Math.round(s.kind === "erase" ? a * (1 - c) : a + (full(p) - a) * c);
      }
    }
  }
}
