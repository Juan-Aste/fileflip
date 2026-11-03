// "Fake transparency": a picture saved with the grey/white checkerboard that
// editors draw behind transparent pixels baked into its pixels. Pure
// functions (they run in a worker): find the checkerboard grid along the
// edges of the image, flood-fill from the edges over the pixels that match
// the colour the grid expects at each spot, and turn them into real
// transparency, then soften the edge of the subject so no light halo is left.
// A checkerboard inside the subject that does not touch the background is not
// reached by the fill, so it stays.

import type { RawImage } from "./pixels";

type Rgb = [number, number, number];

/** Pixel (x, y) is colors[(floor((x + ox) / cell) + floor((y + oy) / cell)) % 2]. */
export interface Checker {
  cell: number;
  ox: number;
  oy: number;
  colors: [Rgb, Rgb];
}

export interface FakeTransparency {
  checker: Checker;
  /** 1 where the drawn background is (connected to the edges), else 0. */
  mask: Uint8Array;
  /** Share of the image that is drawn background (0–1). */
  share: number;
}

const MIN_CELL = 5;
const MAX_CELL = 48;
/** Depth of the bands along each edge where the grid is measured. */
const BAND = 48;
/**
 * How far from the expected colour a pixel may be, in luma and in chroma
 * (JPEG keeps luma fairly well but smears colour around coloured edges).
 */
const LUMA_TOLERANCE = 28;
const CHROMA_TOLERANCE = 20;

/** Is a colour difference small enough to be JPEG noise (in YCbCr, like JPEG itself)? */
function close(dr: number, dg: number, db: number): boolean {
  const y = 0.299 * dr + 0.587 * dg + 0.114 * db;
  const cb = -0.1687 * dr - 0.3313 * dg + 0.5 * db;
  const cr = 0.5 * dr - 0.4187 * dg - 0.0813 * db;
  return Math.abs(y) <= LUMA_TOLERANCE && Math.abs(cb) <= CHROMA_TOLERANCE && Math.abs(cr) <= CHROMA_TOLERANCE;
}
/** Pixels this far from a grid line may be any blend of the two colours (JPEG blurs the cell edges). */
const LINE_SLACK = 1;
/** Subject pixels this close to the background get their alpha estimated (soft, halo-free edge). */
const RING = 2;

const lum = (d: Uint8ClampedArray | Uint8Array, i: number) => (d[i]! * 299 + d[i + 1]! * 587 + d[i + 2]! * 114) / 1000;

/** Light and neutral: what checkerboard colours look like (with some JPEG tint). */
function candidate(d: Uint8ClampedArray | Uint8Array, i: number): boolean {
  if (d[i + 3]! < 250) return false;
  const r = d[i]!;
  const g = d[i + 1]!;
  const b = d[i + 2]!;
  return Math.max(r, g, b) - Math.min(r, g, b) <= 24 && lum(d, i) >= 140;
}

/** Visits every pixel of the four edge bands once. */
function forBands(width: number, height: number, visit: (x: number, y: number) => void) {
  const depthY = Math.min(BAND, Math.floor(height / 2));
  const depthX = Math.min(BAND, Math.floor(width / 2));
  for (let y = 0; y < height; y++) {
    const edgeRow = y < depthY || y >= height - depthY;
    if (edgeRow) for (let x = 0; x < width; x++) visit(x, y);
    else {
      for (let x = 0; x < depthX; x++) visit(x, y);
      for (let x = width - depthX; x < width; x++) visit(x, y);
    }
  }
}

/** Two-means of the luminances of the light, neutral pixels in the edge bands. */
function twoLevels({ data, width, height }: RawImage): [number, number] | null {
  const hist = new Float64Array(256);
  let n = 0;
  forBands(width, height, (x, y) => {
    const i = (y * width + x) * 4;
    if (!candidate(data, i)) return;
    hist[Math.round(lum(data, i))]++;
    n++;
  });
  if (n < 64) return null;
  let lo = 0;
  let hi = 255;
  while (hist[lo] === 0) lo++;
  while (hist[hi] === 0) hi--;
  let c0 = lo;
  let c1 = hi;
  for (let iter = 0; iter < 20; iter++) {
    const th = (c0 + c1) / 2;
    let s0 = 0, n0 = 0, s1 = 0, n1 = 0;
    for (let v = lo; v <= hi; v++) {
      if (v < th) {
        s0 += v * hist[v]!;
        n0 += hist[v]!;
      } else {
        s1 += v * hist[v]!;
        n1 += hist[v]!;
      }
    }
    if (n0 === 0 || n1 === 0) return null;
    c0 = s0 / n0;
    c1 = s1 / n1;
  }
  return [c0, c1];
}

interface Line {
  /** Cell boundaries seen (a boundary b lies between pixels b - 1 and b). */
  bounds: number[];
  /** Runs [start, end) of light neutral pixels. */
  runs: [number, number][];
}

/** Boundaries between the two levels along one line of pixels. */
function scanLine(get: (k: number) => number, length: number, isCandidate: (k: number) => boolean, th: number, margin: number): Line {
  const bounds: number[] = [];
  const runs: [number, number][] = [];
  let runStart = -1;
  let last = -1;
  let lastClass = -1;
  for (let k = 0; k <= length; k++) {
    const ok = k < length && isCandidate(k);
    if (!ok) {
      if (runStart >= 0) runs.push([runStart, k]);
      runStart = -1;
      last = -1;
      continue;
    }
    if (runStart < 0) runStart = k;
    const v = get(k);
    if (Math.abs(v - th) < margin) continue;
    const c = v >= th ? 1 : 0;
    if (last >= 0 && c !== lastClass && k - last <= 3) bounds.push(Math.round((last + 1 + k) / 2));
    last = k;
    lastClass = c;
  }
  return { bounds, runs };
}

/** Best cell size and phase along one axis: boundaries every `cell` pixels, at offset `phase`. */
function fitAxis(lines: Line[], cells: number[]): { cell: number; phase: number; score: number } | null {
  const all = lines.flatMap((l) => l.bounds);
  if (all.length < 6) return null;
  let best: { cell: number; phase: number; score: number } | null = null;
  for (const cell of cells) {
    const hist = new Float64Array(cell);
    for (const b of all) hist[b % cell]++;
    let phase = 0;
    let top = -1;
    for (let r = 0; r < cell; r++) {
      const v = hist[r]! + hist[(r + 1) % cell]! + hist[(r + cell - 1) % cell]!;
      if (v > top) {
        top = v;
        phase = r;
      }
    }
    // Within the winning window, the residue seen most often (JPEG blur can shift a few by one).
    for (const r of [(phase + cell - 1) % cell, (phase + 1) % cell]) if (hist[r]! > hist[phase]! && cell > 2) phase = r;
    // Boundaries the grid predicts inside the light runs (away from their ends).
    let expected = 0;
    for (const line of lines)
      for (const [start, end] of line.runs) {
        const a = start + 2;
        const z = end - 2;
        if (z < a) continue;
        const first = a + ((phase - (a % cell) + cell) % cell);
        if (first <= z) expected += Math.floor((z - first) / cell) + 1;
      }
    if (expected < 3) continue;
    const precision = top / all.length;
    const recall = Math.min(1, top / expected);
    const score = precision * recall;
    if (!best || score > best.score + 1e-9) best = { cell, phase, score };
  }
  return best && best.score >= 0.5 ? best : null;
}

/** Grid class of a pixel (0 or 1). */
export const cellClass = (c: Checker, x: number, y: number) => (Math.floor((x + c.ox) / c.cell) + Math.floor((y + c.oy) / c.cell)) & 1;

/** True when (x, y) is within LINE_SLACK pixels of a cell edge. */
function nearLine(c: Checker, x: number, y: number): boolean {
  const rx = (x + c.ox) % c.cell;
  const ry = (y + c.oy) % c.cell;
  return rx < LINE_SLACK || rx >= c.cell - LINE_SLACK || ry < LINE_SLACK || ry >= c.cell - LINE_SLACK;
}

/** Finds the checkerboard grid and its two colours along the edges, or null. */
export function findChecker(image: RawImage): Checker | null {
  const { data, width, height } = image;
  if (width < 2 * MIN_CELL || height < 2 * MIN_CELL) return null;
  const levels = twoLevels(image);
  if (!levels) return null;
  const [c0, c1] = levels;
  if (c1 - c0 < 6 || c1 - c0 > 100) return null;
  const th = (c0 + c1) / 2;
  const margin = (c1 - c0) * 0.25;
  const isCand = (x: number, y: number) => candidate(data, (y * width + x) * 4);
  const lumAt = (x: number, y: number) => lum(data, (y * width + x) * 4);

  const depthY = Math.min(BAND, Math.floor(height / 2));
  const depthX = Math.min(BAND, Math.floor(width / 2));
  // Rows of the top and bottom bands, and the left and right parts of the others.
  const rows: Line[] = [];
  for (let y = 0; y < height; y++) {
    if (y < depthY || y >= height - depthY) rows.push(scanLine((x) => lumAt(x, y), width, (x) => isCand(x, y), th, margin));
    else {
      rows.push(scanLine((x) => lumAt(x, y), depthX, (x) => isCand(x, y), th, margin));
      const off = width - depthX;
      const line = scanLine((x) => lumAt(off + x, y), depthX, (x) => isCand(off + x, y), th, margin);
      rows.push({ bounds: line.bounds.map((b) => b + off), runs: line.runs.map(([a, z]) => [a + off, z + off]) });
    }
  }
  const cols: Line[] = [];
  for (let x = 0; x < width; x++) {
    if (x < depthX || x >= width - depthX) cols.push(scanLine((y) => lumAt(x, y), height, (y) => isCand(x, y), th, margin));
    else {
      cols.push(scanLine((y) => lumAt(x, y), depthY, (y) => isCand(x, y), th, margin));
      const off = height - depthY;
      const line = scanLine((y) => lumAt(x, off + y), depthY, (y) => isCand(x, off + y), th, margin);
      cols.push({ bounds: line.bounds.map((b) => b + off), runs: line.runs.map(([a, z]) => [a + off, z + off]) });
    }
  }
  const maxCell = Math.min(MAX_CELL, Math.floor(Math.min(width, height) / 2));
  const cells: number[] = [];
  for (let s = MIN_CELL; s <= maxCell; s++) cells.push(s);
  const fx = fitAxis(rows, cells);
  if (!fx) return null;
  const fy = fitAxis(cols, [fx.cell]);
  if (!fy) return null;
  const cell = fx.cell;
  const base = { cell, ox: (cell - fx.phase) % cell, oy: (cell - fy.phase) % cell, colors: [[0, 0, 0], [0, 0, 0]] as [Rgb, Rgb] };

  // The colour of each class, away from the cell edges.
  const sums = [new Float64Array(3), new Float64Array(3)];
  const counts = [0, 0];
  forBands(width, height, (x, y) => {
    const i = (y * width + x) * 4;
    if (!candidate(data, i) || nearLine(base, x, y)) return;
    const k = cellClass(base, x, y);
    for (let ch = 0; ch < 3; ch++) sums[k]![ch] += data[i + ch]!;
    counts[k]!++;
  });
  if (counts[0]! < 16 || counts[1]! < 16) return null;
  const colors = sums.map((s, k) => [0, 1, 2].map((ch) => Math.round(s[ch]! / counts[k]!)) as Rgb) as [Rgb, Rgb];
  const l0 = (colors[0][0] * 299 + colors[0][1] * 587 + colors[0][2] * 114) / 1000;
  const l1 = (colors[1][0] * 299 + colors[1][1] * 587 + colors[1][2] * 114) / 1000;
  if (Math.abs(l0 - l1) < 6) return null;
  const checker: Checker = { ...base, colors };

  // Most light pixels of the bands must be where the grid says, in its colour.
  let match = 0;
  let total = 0;
  forBands(width, height, (x, y) => {
    const i = (y * width + x) * 4;
    if (!candidate(data, i) || nearLine(checker, x, y)) return;
    total++;
    if (fits(data, i, colors[cellClass(checker, x, y)])) match++;
  });
  return total > 0 && match / total >= 0.85 ? checker : null;
}

function fits(d: Uint8ClampedArray | Uint8Array, i: number, c: Rgb): boolean {
  return d[i + 3]! >= 250 && close(d[i]! - c[0], d[i + 1]! - c[1], d[i + 2]! - c[2]);
}

/** Closest point to (r, g, b) on the segment between the two colours, and whether it is close to it. */
function onSegment(c: [Rgb, Rgb], r: number, g: number, b: number): { point: Rgb; near: boolean } {
  const [a, z] = c;
  const d = [z[0] - a[0], z[1] - a[1], z[2] - a[2]];
  const len = d[0]! * d[0]! + d[1]! * d[1]! + d[2]! * d[2]!;
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, ((r - a[0]) * d[0]! + (g - a[1]) * d[1]! + (b - a[2]) * d[2]!) / len));
  const point: Rgb = [a[0] + d[0]! * t, a[1] + d[1]! * t, a[2] + d[2]! * t];
  return { point, near: close(r - point[0], g - point[1], b - point[2]) };
}

/** Does pixel i at (x, y) look like the drawn background? */
function isBackground(d: Uint8ClampedArray | Uint8Array, i: number, x: number, y: number, c: Checker): boolean {
  if (d[i + 3]! < 250) return false;
  if (!nearLine(c, x, y)) return fits(d, i, c.colors[cellClass(c, x, y)]);
  return onSegment(c.colors, d[i]!, d[i + 1]!, d[i + 2]!).near;
}

/** Flood fill from every edge pixel over the pixels that match the grid. */
function fillFromEdges({ data, width, height }: RawImage, c: Checker): Uint8Array {
  const mask = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let top = 0;
  const seed = (x: number, y: number) => {
    const p = y * width + x;
    if (mask[p] || !isBackground(data, p * 4, x, y, c)) return;
    mask[p] = 1;
    stack[top++] = p;
  };
  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }
  while (top > 0) {
    const p = stack[--top]!;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) seed(x - 1, y);
    if (x < width - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < height - 1) seed(x, y + 1);
  }
  return mask;
}

/**
 * Looks for a drawn checkerboard background. Null when there is none (most
 * photos, plain backgrounds, a checkerboard that does not touch the edges).
 */
export function detectFakeTransparency(image: RawImage): FakeTransparency | null {
  const checker = findChecker(image);
  if (!checker) return null;
  const { width, height } = image;
  const mask = fillFromEdges(image, checker);
  let filled = 0;
  const perClass = [0, 0];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (mask[y * width + x]) {
        filled++;
        if (!nearLine(checker, x, y)) perClass[cellClass(checker, x, y)]!++;
      }
  let edge = 0;
  for (let x = 0; x < width; x++) edge += mask[x]! + mask[(height - 1) * width + x]!;
  for (let y = 1; y < height - 1; y++) edge += mask[y * width]! + mask[y * width + width - 1]!;
  const edgeTotal = 2 * width + 2 * Math.max(0, height - 2);
  const share = filled / (width * height);
  // Enough of it, along the edges, with both colours of the grid (not a plain light background).
  const cells = filled / (checker.cell * checker.cell);
  if (share < 0.02 || cells < 4 || edge / edgeTotal < 0.2) return null;
  const minor = Math.min(perClass[0]!, perClass[1]!) / Math.max(1, perClass[0]! + perClass[1]!);
  if (minor < 0.25) return null;
  return { checker, mask, share };
}

/**
 * Turns the drawn background into real transparency (alpha 0) and estimates
 * the alpha of the subject's edge pixels (blends of the subject and the
 * checkerboard), restoring their own colour. Returns a new image.
 */
export function removeFakeTransparency(image: RawImage, found: FakeTransparency): RawImage {
  const { width, height, data } = image;
  const { mask, checker } = found;
  const out = new Uint8ClampedArray(data);
  // Chebyshev distance to the background, up to RING + 2.
  const far = RING + 2;
  const dist = new Uint8Array(width * height).fill(far);
  let frontier: number[] = [];
  // Start from the background pixels next to the subject (not the whole background).
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    dist[p] = 0;
    const x = p % width;
    const y = (p - x) / width;
    if ((x > 0 && !mask[p - 1]) || (x < width - 1 && !mask[p + 1]) || (y > 0 && !mask[p - width]) || (y < height - 1 && !mask[p + width])) frontier.push(p);
  }
  for (let d = 1; d < far; d++) {
    const next: number[] = [];
    for (const p of frontier) {
      const x = p % width;
      const y = (p - x) / width;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (dist[q]! > d) {
            dist[q] = d;
            next.push(q);
          }
        }
    }
    frontier = next;
  }

  for (let p = 0; p < mask.length; p++) {
    const i = p * 4;
    if (mask[p]) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      continue;
    }
    if (dist[p]! > RING) continue;
    // The subject's own colour: the mean of the nearby pixels well inside it.
    const x = p % width;
    const y = (p - x) / width;
    const f = [0, 0, 0];
    let n = 0;
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (dist[q]! <= RING) continue;
        f[0] += data[q * 4]!;
        f[1] += data[q * 4 + 1]!;
        f[2] += data[q * 4 + 2]!;
        n++;
      }
    if (n === 0) continue;
    const fr = f[0]! / n;
    const fg = f[1]! / n;
    const fb = f[2]! / n;
    const bg = onSegment(checker.colors, data[i]!, data[i + 1]!, data[i + 2]!).point;
    const vr = fr - bg[0];
    const vg = fg - bg[1];
    const vb = fb - bg[2];
    const len = vr * vr + vg * vg + vb * vb;
    // A subject about as light as the checkerboard: its edge cannot be told apart, keep it.
    if (len < 24 * 24) continue;
    const a = Math.min(1, Math.max(0, ((data[i]! - bg[0]) * vr + (data[i + 1]! - bg[1]) * vg + (data[i + 2]! - bg[2]) * vb) / len));
    if (a < 0.06) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      continue;
    }
    for (let ch = 0; ch < 3; ch++) out[i + ch] = bg[ch]! + (data[i + ch]! - bg[ch]!) / a;
    out[i + 3] = Math.round(a * data[i + 3]!);
  }
  return { data: out, width, height };
}
