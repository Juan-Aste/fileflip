// GrabCut (Rother, Kolmogorov and Blake, "GrabCut: Interactive Foreground
// Extraction using Iterated Graph Cuts", SIGGRAPH 2004), our own
// implementation: no model and no training data. The colors of the subject
// and of the background are modeled for each photo with a mixture of 5
// Gaussians each, learned from what the user marked (a rectangle and
// "keep"/"remove" strokes), and a minimum graph cut separates them while
// keeping the edge along color changes. The steps and constants follow the
// paper (and OpenCV's implementation of it: gamma 50, 8 neighbours).

import { Graph } from "./maxflow";

/** Trimap labels (same values as OpenCV). */
export const BGD = 0;
export const FGD = 1;
export const PR_BGD = 2;
export const PR_FGD = 3;

const K = 5;
const GAMMA = 50;
const LAMBDA = 9 * GAMMA;

/** Mixture of K Gaussians over RGB (0–255). */
class GMM {
  readonly coef = new Float64Array(K);
  readonly mean = new Float64Array(K * 3);
  readonly cov = new Float64Array(K * 9);
  readonly inv = new Float64Array(K * 9);
  readonly norm = new Float64Array(K);
  private sums = new Float64Array(K * 3);
  private prods = new Float64Array(K * 9);
  private counts = new Float64Array(K);
  private total = 0;

  /** Likelihood of one component (without the constant factor, as in the paper's energy). */
  component(k: number, r: number, g: number, b: number): number {
    if (this.coef[k] === 0) return 0;
    const m = k * 3;
    const d0 = r - this.mean[m]!;
    const d1 = g - this.mean[m + 1]!;
    const d2 = b - this.mean[m + 2]!;
    const c = k * 9;
    const i = this.inv;
    const mult =
      d0 * (d0 * i[c]! + d1 * i[c + 3]! + d2 * i[c + 6]!) +
      d1 * (d0 * i[c + 1]! + d1 * i[c + 4]! + d2 * i[c + 7]!) +
      d2 * (d0 * i[c + 2]! + d1 * i[c + 5]! + d2 * i[c + 8]!);
    return this.norm[k]! * Math.exp(-0.5 * mult);
  }

  probability(r: number, g: number, b: number): number {
    let p = 0;
    for (let k = 0; k < K; k++) p += this.coef[k]! * this.component(k, r, g, b);
    return p;
  }

  whichComponent(r: number, g: number, b: number): number {
    let best = 0;
    let max = -1;
    for (let k = 0; k < K; k++) {
      const p = this.component(k, r, g, b);
      if (p > max) {
        max = p;
        best = k;
      }
    }
    return best;
  }

  initLearning() {
    this.sums.fill(0);
    this.prods.fill(0);
    this.counts.fill(0);
    this.total = 0;
  }

  addSample(k: number, r: number, g: number, b: number) {
    const s = k * 3;
    this.sums[s] += r;
    this.sums[s + 1] += g;
    this.sums[s + 2] += b;
    const p = k * 9;
    const q = this.prods;
    q[p] += r * r;
    q[p + 1] += r * g;
    q[p + 2] += r * b;
    q[p + 3] += g * r;
    q[p + 4] += g * g;
    q[p + 5] += g * b;
    q[p + 6] += b * r;
    q[p + 7] += b * g;
    q[p + 8] += b * b;
    this.counts[k]++;
    this.total++;
  }

  endLearning() {
    for (let k = 0; k < K; k++) {
      const n = this.counts[k]!;
      if (n === 0) {
        this.coef[k] = 0;
        continue;
      }
      this.coef[k] = n / this.total;
      const m = k * 3;
      for (let a = 0; a < 3; a++) this.mean[m + a] = this.sums[m + a]! / n;
      const c = k * 9;
      for (let a = 0; a < 3; a++)
        for (let e = 0; e < 3; e++) this.cov[c + a * 3 + e] = this.prods[c + a * 3 + e]! / n - this.mean[m + a]! * this.mean[m + e]!;
      // Flat colors give a singular covariance: add a little white noise.
      if (det(this.cov, c) <= 1e-6) for (let a = 0; a < 3; a++) this.cov[c + a * 4] += 0.01;
      const d = det(this.cov, c);
      invert(this.cov, c, d, this.inv);
      this.norm[k] = 1 / Math.sqrt(d);
    }
  }
}

function det(m: Float64Array, c: number): number {
  return (
    m[c]! * (m[c + 4]! * m[c + 8]! - m[c + 5]! * m[c + 7]!) -
    m[c + 1]! * (m[c + 3]! * m[c + 8]! - m[c + 5]! * m[c + 6]!) +
    m[c + 2]! * (m[c + 3]! * m[c + 7]! - m[c + 4]! * m[c + 6]!)
  );
}

function invert(m: Float64Array, c: number, d: number, out: Float64Array) {
  const a = (i: number) => m[c + i]!;
  out[c] = (a(4) * a(8) - a(5) * a(7)) / d;
  out[c + 1] = (a(2) * a(7) - a(1) * a(8)) / d;
  out[c + 2] = (a(1) * a(5) - a(2) * a(4)) / d;
  out[c + 3] = (a(5) * a(6) - a(3) * a(8)) / d;
  out[c + 4] = (a(0) * a(8) - a(2) * a(6)) / d;
  out[c + 5] = (a(2) * a(3) - a(0) * a(5)) / d;
  out[c + 6] = (a(3) * a(7) - a(4) * a(6)) / d;
  out[c + 7] = (a(1) * a(6) - a(0) * a(7)) / d;
  out[c + 8] = (a(0) * a(4) - a(1) * a(3)) / d;
}

/** Small deterministic PRNG (mulberry32): the same marks always give the same cut. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** k-means (k-means++ start, on at most 20 000 samples) → the component of each pixel. */
function kmeans(rgb: Float32Array, pixels: Int32Array, out: Uint8Array) {
  const rand = random(1234);
  const n = pixels.length;
  const step = Math.max(1, Math.floor(n / 20000));
  const sample: number[] = [];
  for (let i = 0; i < n; i += step) sample.push(pixels[i]!);
  const centers = new Float64Array(K * 3);
  const d2 = new Float64Array(sample.length).fill(Infinity);
  let pick = sample[Math.floor(rand() * sample.length)]!;
  for (let k = 0; k < K; k++) {
    centers.set([rgb[pick * 3]!, rgb[pick * 3 + 1]!, rgb[pick * 3 + 2]!], k * 3);
    let total = 0;
    for (let s = 0; s < sample.length; s++) {
      const p = sample[s]! * 3;
      const d = (rgb[p]! - centers[k * 3]!) ** 2 + (rgb[p + 1]! - centers[k * 3 + 1]!) ** 2 + (rgb[p + 2]! - centers[k * 3 + 2]!) ** 2;
      if (d < d2[s]!) d2[s] = d;
      total += d2[s]!;
    }
    let target = rand() * total;
    let s = 0;
    for (; s < sample.length - 1 && target > d2[s]!; s++) target -= d2[s]!;
    pick = sample[s]!;
  }
  const nearest = (p: number) => {
    let best = 0;
    let min = Infinity;
    for (let k = 0; k < K; k++) {
      const d = (rgb[p]! - centers[k * 3]!) ** 2 + (rgb[p + 1]! - centers[k * 3 + 1]!) ** 2 + (rgb[p + 2]! - centers[k * 3 + 2]!) ** 2;
      if (d < min) {
        min = d;
        best = k;
      }
    }
    return best;
  };
  for (let iter = 0; iter < 10; iter++) {
    const sums = new Float64Array(K * 4);
    for (const px of sample) {
      const k = nearest(px * 3);
      sums[k * 4] += rgb[px * 3]!;
      sums[k * 4 + 1] += rgb[px * 3 + 1]!;
      sums[k * 4 + 2] += rgb[px * 3 + 2]!;
      sums[k * 4 + 3]++;
    }
    for (let k = 0; k < K; k++) {
      const c = sums[k * 4 + 3]!;
      if (c > 0) for (let a = 0; a < 3; a++) centers[k * 3 + a] = sums[k * 4 + a]! / c;
    }
  }
  for (let i = 0; i < n; i++) out[pixels[i]!] = nearest(pixels[i]! * 3);
}

export type Rect = { x: number; y: number; width: number; height: number };
export type Stroke = { kind: "keep" | "remove"; radius: number; points: [number, number][] };

/** Outside the rectangle: background for sure; inside: probably subject. Then the strokes, in order. */
export function buildTrimap(width: number, height: number, rect: Rect, strokes: readonly Stroke[] = []): Uint8Array {
  const trimap = new Uint8Array(width * height);
  const x0 = Math.max(0, Math.round(rect.x));
  const y0 = Math.max(0, Math.round(rect.y));
  const x1 = Math.min(width, Math.round(rect.x + rect.width));
  const y1 = Math.min(height, Math.round(rect.y + rect.height));
  for (let y = y0; y < y1; y++) trimap.fill(PR_FGD, y * width + x0, y * width + x1);
  for (const stroke of strokes) paintStroke(trimap, width, height, stroke);
  return trimap;
}

/** Paints a stroke (round brush along the segments) as sure subject or sure background. */
export function paintStroke(trimap: Uint8Array, width: number, height: number, { kind, radius, points }: Stroke) {
  const label = kind === "keep" ? FGD : BGD;
  const r = Math.max(0.5, radius);
  const r2 = r * r;
  for (let s = 0; s < points.length; s++) {
    const [ax, ay] = points[s]!;
    const [bx, by] = points[Math.min(s + 1, points.length - 1)]!;
    const minX = Math.max(0, Math.floor(Math.min(ax, bx) - r));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(ax, bx) + r));
    const minY = Math.max(0, Math.floor(Math.min(ay, by) - r));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(ay, by) + r));
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const t = len2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
        const ex = px - (ax + t * dx);
        const ey = py - (ay + t * dy);
        if (ex * ex + ey * ey <= r2) trimap[y * width + x] = label;
      }
    }
  }
}

/**
 * Runs GrabCut on an RGBA image with the given trimap (changed in place:
 * the "probably" labels follow the cut) and returns the subject mask (1 = keep).
 */
export function grabCut(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number, trimap: Uint8Array, iterations = 4): Uint8Array {
  const n = width * height;
  if (rgba.length !== n * 4 || trimap.length !== n) throw new Error("Wrong image size");
  const mask = new Uint8Array(n);
  const rgb = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    rgb[i * 3] = rgba[i * 4]!;
    rgb[i * 3 + 1] = rgba[i * 4 + 1]!;
    rgb[i * 3 + 2] = rgba[i * 4 + 2]!;
  }
  const isFg = (i: number) => trimap[i] === FGD || trimap[i] === PR_FGD;
  let fgCount = 0;
  let unknown = 0;
  for (let i = 0; i < n; i++) {
    if (isFg(i)) fgCount++;
    if (trimap[i]! >= PR_BGD) unknown++;
  }
  // Nothing to decide, or one of the two classes is empty.
  if (unknown === 0 || fgCount === 0 || fgCount === n) {
    for (let i = 0; i < n; i++) mask[i] = isFg(i) ? 1 : 0;
    return mask;
  }

  // Edge weights: high where neighbouring colors are alike (cutting there costs more).
  const beta = computeBeta(rgb, width, height);
  const diag = GAMMA / Math.SQRT2;
  const nw = (a: number, b: number, g: number) => {
    const d = (rgb[a * 3]! - rgb[b * 3]!) ** 2 + (rgb[a * 3 + 1]! - rgb[b * 3 + 1]!) ** 2 + (rgb[a * 3 + 2]! - rgb[b * 3 + 2]!) ** 2;
    return g * Math.exp(-beta * d);
  };
  const left = new Float64Array(n);
  const upLeft = new Float64Array(n);
  const up = new Float64Array(n);
  const upRight = new Float64Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x > 0) left[i] = nw(i, i - 1, GAMMA);
      if (x > 0 && y > 0) upLeft[i] = nw(i, i - width - 1, diag);
      if (y > 0) up[i] = nw(i, i - width, GAMMA);
      if (x < width - 1 && y > 0) upRight[i] = nw(i, i - width + 1, diag);
    }
  }

  const fg = new GMM();
  const bg = new GMM();
  const comp = new Uint8Array(n);
  const fgPixels: number[] = [];
  const bgPixels: number[] = [];
  for (let i = 0; i < n; i++) (isFg(i) ? fgPixels : bgPixels).push(i);
  kmeans(rgb, Int32Array.from(fgPixels), comp);
  kmeans(rgb, Int32Array.from(bgPixels), comp);
  const learn = () => {
    fg.initLearning();
    bg.initLearning();
    for (let i = 0; i < n; i++) (isFg(i) ? fg : bg).addSample(comp[i]!, rgb[i * 3]!, rgb[i * 3 + 1]!, rgb[i * 3 + 2]!);
    fg.endLearning();
    bg.endLearning();
  };
  learn();

  const pairs = 4 * n;
  for (let iter = 0; iter < iterations; iter++) {
    if (iter > 0) {
      for (let i = 0; i < n; i++) comp[i] = (isFg(i) ? fg : bg).whichComponent(rgb[i * 3]!, rgb[i * 3 + 1]!, rgb[i * 3 + 2]!);
      learn();
    }
    const graph = new Graph(n, pairs);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const label = trimap[i]!;
        let source: number;
        let sink: number;
        if (label === FGD) {
          source = LAMBDA;
          sink = 0;
        } else if (label === BGD) {
          source = 0;
          sink = LAMBDA;
        } else {
          const r = rgb[i * 3]!;
          const g = rgb[i * 3 + 1]!;
          const b = rgb[i * 3 + 2]!;
          source = -Math.log(Math.max(bg.probability(r, g, b), 1e-300));
          sink = -Math.log(Math.max(fg.probability(r, g, b), 1e-300));
        }
        graph.addTermWeights(i, source, sink);
        if (x > 0) graph.addEdges(i, i - 1, left[i]!, left[i]!);
        if (x > 0 && y > 0) graph.addEdges(i, i - width - 1, upLeft[i]!, upLeft[i]!);
        if (y > 0) graph.addEdges(i, i - width, up[i]!, up[i]!);
        if (x < width - 1 && y > 0) graph.addEdges(i, i - width + 1, upRight[i]!, upRight[i]!);
      }
    }
    graph.maxFlow();
    for (let i = 0; i < n; i++) if (trimap[i]! >= PR_BGD) trimap[i] = graph.inSourceSegment(i) ? PR_FGD : PR_BGD;
  }
  for (let i = 0; i < n; i++) mask[i] = isFg(i) ? 1 : 0;
  return mask;
}

function computeBeta(rgb: Float32Array, width: number, height: number): number {
  let sum = 0;
  let count = 0;
  const d = (a: number, b: number) =>
    (rgb[a * 3]! - rgb[b * 3]!) ** 2 + (rgb[a * 3 + 1]! - rgb[b * 3 + 1]!) ** 2 + (rgb[a * 3 + 2]! - rgb[b * 3 + 2]!) ** 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const add = (j: number) => {
        sum += d(i, j);
        count++;
      };
      if (x > 0) add(i - 1);
      if (x > 0 && y > 0) add(i - width - 1);
      if (y > 0) add(i - width);
      if (x < width - 1 && y > 0) add(i - width + 1);
    }
  }
  return sum <= 1e-9 || count === 0 ? 0 : 1 / ((2 * sum) / count);
}
