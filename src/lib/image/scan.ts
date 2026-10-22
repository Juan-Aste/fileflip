// "Scan document": a phone photo of a page → the page seen from the front.
// Four corners picked on the photo are mapped to a rectangle with a
// homography (perspective transform), then the page can be turned into clean
// black and white with an adaptive threshold (Bradley–Roth). Pure functions on
// RGBA pixels, shared by the worker and the tests.
import type { RawImage } from "./pixels";

export interface Point {
  x: number;
  y: number;
}

/** Top-left, top-right, bottom-right, bottom-left, in image pixels. */
export type Quad = [Point, Point, Point, Point];

export type ScanMode = "bw" | "gray" | "color";

/** Longest side of a straightened page: about A4 at 200 dpi. */
export const MAX_SCAN_SIDE = 2400;

/** Corners a little inside the photo's edges: a starting point to drag from. */
export function defaultQuad(width: number, height: number, inset = 0.06): Quad {
  const dx = width * inset;
  const dy = height * inset;
  return [
    { x: dx, y: dy },
    { x: width - dx, y: dy },
    { x: width - dx, y: height - dy },
    { x: dx, y: height - dy },
  ];
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** A quad is usable when its corners go clockwise without crossing (convex) and it isn't tiny. */
export function isValidQuad(q: Quad, width: number, height: number): boolean {
  if (q.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < -1 || p.y < -1 || p.x > width + 1 || p.y > height + 1)) return false;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i]!;
    const b = q[(i + 1) % 4]!;
    const c = q[(i + 2) % 4]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-9) return false;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  // Clockwise on screen (y down) gives a positive cross product.
  return sign > 0 && Math.min(dist(q[0], q[1]), dist(q[1], q[2])) >= 16;
}

/** Output size: the average lengths of opposite sides, scaled down to MAX_SCAN_SIDE. */
export function scanSize(q: Quad, maxSide = MAX_SCAN_SIDE) {
  const w = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
  const h = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
  const k = Math.min(1, maxSide / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/**
 * The homography H (row-major 3×3, h33 = 1) with H·src[i] ∝ dst[i], solved
 * from the 8 linear equations of the four point pairs (Gaussian elimination).
 */
export function homography(src: Quad, dst: Quad): number[] {
  const a: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]!;
    const { x: u, y: v } = dst[i]!;
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(a[r]![col]!) > Math.abs(a[pivot]![col]!)) pivot = r;
    [a[col], a[pivot]] = [a[pivot]!, a[col]!];
    const p = a[col]![col]!;
    if (Math.abs(p) < 1e-12) throw new Error("Degenerate quad");
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = a[r]![col]! / p;
      if (f) for (let c = col; c < 9; c++) a[r]![c]! -= f * a[col]![c]!;
    }
  }
  return [...a.map((row, i) => row[8]! / row[i]!), 1];
}

export const project = (h: number[], x: number, y: number): Point => {
  const w = h[6]! * x + h[7]! * y + h[8]!;
  return { x: (h[0]! * x + h[1]! * y + h[2]!) / w, y: (h[3]! * x + h[4]! * y + h[5]!) / w };
};

/** The page inside `quad`, straightened to `size` (bilinear sampling, white outside the photo). */
export function warpQuad(image: RawImage, quad: Quad, size: { width: number; height: number }): RawImage {
  const { width: W, height: H } = size;
  // Output pixel → photo pixel.
  const back = homography([{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }], quad);
  const out = new Uint8ClampedArray(W * H * 4);
  const src = image.data;
  const iw = image.width;
  const ih = image.height;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = project(back, x + 0.5, y + 0.5);
      const fx = p.x - 0.5;
      const fy = p.y - 0.5;
      const o = (y * W + x) * 4;
      if (fx < -0.5 || fy < -0.5 || fx > iw - 0.5 || fy > ih - 0.5) {
        out.fill(255, o, o + 4);
        continue;
      }
      const x0 = Math.max(0, Math.min(iw - 1, Math.floor(fx)));
      const y0 = Math.max(0, Math.min(ih - 1, Math.floor(fy)));
      const x1 = Math.min(iw - 1, x0 + 1);
      const y1 = Math.min(ih - 1, y0 + 1);
      const tx = Math.max(0, Math.min(1, fx - x0));
      const ty = Math.max(0, Math.min(1, fy - y0));
      for (let c = 0; c < 4; c++) {
        const top = src[(y0 * iw + x0) * 4 + c]! * (1 - tx) + src[(y0 * iw + x1) * 4 + c]! * tx;
        const bottom = src[(y1 * iw + x0) * 4 + c]! * (1 - tx) + src[(y1 * iw + x1) * 4 + c]! * tx;
        out[o + c] = top * (1 - ty) + bottom * ty;
      }
    }
  }
  return { data: out, width: W, height: H };
}

/** Luma (Rec. 601) of each pixel, transparent areas as white. */
function luma(image: RawImage): Float32Array {
  const g = new Float32Array(image.width * image.height);
  const d = image.data;
  for (let i = 0; i < g.length; i++) {
    const a = d[i * 4 + 3]! / 255;
    const y = 0.299 * d[i * 4]! + 0.587 * d[i * 4 + 1]! + 0.114 * d[i * 4 + 2]!;
    g[i] = y * a + 255 * (1 - a);
  }
  return g;
}

/**
 * Black and white with a local threshold: a pixel is ink when it is more than
 * `t` darker than the average of the window around it (1/8 of the page), so
 * shadows and uneven light across a phone photo don't turn into black areas.
 */
export function adaptiveThreshold(image: RawImage, t = 0.15): RawImage {
  const { width: w, height: h } = image;
  const g = luma(image);
  // Integral image (one extra row and column of zeros).
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += g[y * w + x]!;
      sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1]! + row;
    }
  }
  const r = Math.max(4, Math.round(Math.max(w, h) / 16));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w, x + r + 1);
      const area = (x1 - x0) * (y1 - y0);
      const total = sum[y1 * (w + 1) + x1]! - sum[y0 * (w + 1) + x1]! - sum[y1 * (w + 1) + x0]! + sum[y0 * (w + 1) + x0]!;
      const v = g[y * w + x]! * area < total * (1 - t) ? 0 : 255;
      const o = (y * w + x) * 4;
      out[o] = out[o + 1] = out[o + 2] = v;
      out[o + 3] = 255;
    }
  }
  return { data: out, width: w, height: h };
}

/** Grey with the contrast stretched (1st–99th percentile → black–white), like a copier. */
export function enhancedGray(image: RawImage): RawImage {
  const g = luma(image);
  const hist = new Uint32Array(256);
  for (const v of g) hist[Math.round(v)]!++;
  const pick = (share: number) => {
    let acc = 0;
    for (let i = 0; i < 256; i++) if ((acc += hist[i]!) >= g.length * share) return i;
    return 255;
  };
  const lo = pick(0.01);
  const hi = Math.max(lo + 1, pick(0.99));
  const out = new Uint8ClampedArray(g.length * 4);
  for (let i = 0; i < g.length; i++) {
    const v = ((g[i]! - lo) / (hi - lo)) * 255;
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return { data: out, width: image.width, height: image.height };
}
