// GrabCut on photos we generate ourselves, so the right answer (the
// reference mask) is known exactly. The result is checked by IoU at full
// size, and the PNG is decoded with sharp (libvips), not with our code.
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { applyMask, downscale, iou, segment, workSize } from "./cutout";
import { initialRect } from "./edit";
import { BGD, buildTrimap, FGD, grabCut, PR_FGD, type Rect, type Stroke } from "./grabcut";
import { Graph } from "./maxflow";

/** Deterministic noise in [-1, 1]. */
function noise(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 31 - 1;
  };
}

type Scene = { rgba: Uint8ClampedArray; ref: Uint8Array; width: number; height: number };

/**
 * A "product" (a shaded ellipse with a box under it) over a background.
 * `inside(x, y)` is the exact reference; colors get a little sensor noise.
 */
function scene(
  width: number,
  height: number,
  background: (x: number, y: number) => [number, number, number],
  subject: (x: number, y: number) => [number, number, number] | null,
  seed = 7,
): Scene {
  const rand = noise(seed);
  const rgba = new Uint8ClampedArray(width * height * 4);
  const ref = new Uint8Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const s = subject(x + 0.5, y + 0.5);
      const c = s ?? background(x, y);
      const i = (y * width + x) * 4;
      for (let k = 0; k < 3; k++) rgba[i + k] = c[k]! + rand() * 6;
      rgba[i + 3] = 255;
      ref[y * width + x] = s ? 255 : 0;
    }
  return { rgba, ref, width, height };
}

const W = 640;
const H = 480;
const product = (x: number, y: number): [number, number, number] | null => {
  const ex = (x - 320) / 130;
  const ey = (y - 200) / 110;
  if (ex * ex + ey * ey <= 1) {
    const shade = 1 - 0.35 * Math.hypot(ex + 0.3, ey + 0.3);
    return [220 * shade + 20, 60 * shade + 10, 40 * shade];
  }
  if (x >= 230 && x < 410 && y >= 290 && y < 400) return [40 + (y - 290) * 0.4, 70, 150 + (x - 230) * 0.2];
  return null;
};
const plain = (): [number, number, number] => [232, 228, 220];
const textured = (x: number, y: number): [number, number, number] => {
  const stripe = Math.floor((x + y) / 18) % 2;
  const wave = 20 * Math.sin(x / 23) * Math.cos(y / 31);
  return stripe ? [90 + wave, 170 + wave, 110] : [150, 200 + wave, 170 - wave];
};
const RECT: Rect = { x: 160, y: 60, width: 320, height: 380 };

/** The whole pipeline the worker runs: work copy, cut, mask back at full size, PNG through sharp. */
async function cut({ rgba, width, height }: Scene, rect: Rect, strokes: Stroke[] = []) {
  const ws = workSize(width, height);
  const work = downscale(rgba, width, height, ws.width, ws.height);
  const s = ws.width / width;
  const scaled = (r: Rect): Rect => ({ x: r.x * s, y: r.y * s, width: r.width * s, height: r.height * s });
  const workStrokes = strokes.map((k) => ({ ...k, radius: k.radius * s, points: k.points.map(([x, y]) => [x * s, y * s] as [number, number]) }));
  const mask = segment(work, ws.width, ws.height, scaled(rect), workStrokes);
  const out = new Uint8ClampedArray(rgba);
  applyMask(out, width, height, mask, ws.width, ws.height, { kind: "transparent" });
  const png = await sharp(Buffer.from(out.buffer), { raw: { width, height, channels: 4 } }).png().toBuffer();
  const decoded = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = decoded.data[i * 4 + 3]!;
  return { alpha, png, info: decoded.info };
}

describe("maxflow", () => {
  it("matches a brute-force minimum cut on small random graphs", () => {
    const rand = noise(42);
    for (let trial = 0; trial < 40; trial++) {
      const n = 6;
      const term: [number, number][] = [];
      const edges: [number, number, number, number][] = [];
      const graph = new Graph(n, 20);
      for (let i = 0; i < n; i++) {
        const t: [number, number] = [Math.max(0, rand() * 10), Math.max(0, rand() * 10)];
        term.push(t);
        graph.addTermWeights(i, t[0], t[1]);
      }
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
          if (rand() > 0) {
            const e: [number, number, number, number] = [i, j, Math.round((rand() + 1) * 5), Math.round((rand() + 1) * 5)];
            edges.push(e);
            graph.addEdges(...e);
          }
      const flow = graph.maxFlow();
      // Brute force: every assignment (bit set = sink side).
      let best = Infinity;
      for (let m = 0; m < 1 << n; m++) {
        let c = 0;
        for (let i = 0; i < n; i++) c += m & (1 << i) ? term[i]![0] : term[i]![1];
        for (const [i, j, w, r] of edges) {
          const si = !(m & (1 << i));
          const sj = !(m & (1 << j));
          if (si && !sj) c += w;
          if (sj && !si) c += r;
        }
        best = Math.min(best, c);
      }
      expect(flow).toBeCloseTo(best, 6);
      // The segmentation it reports is a minimum cut too.
      let c = 0;
      for (let i = 0; i < n; i++) c += graph.inSourceSegment(i) ? term[i]![1] : term[i]![0];
      for (const [i, j, w, r] of edges) {
        if (graph.inSourceSegment(i) && !graph.inSourceSegment(j)) c += w;
        if (graph.inSourceSegment(j) && !graph.inSourceSegment(i)) c += r;
      }
      expect(c).toBeCloseTo(best, 6);
    }
  });
});

describe("buildTrimap", () => {
  it("rectangle is 'probably subject', outside is background, strokes win", () => {
    const t = buildTrimap(10, 10, { x: 2, y: 2, width: 6, height: 6 }, [
      { kind: "remove", radius: 1, points: [[4.5, 4.5]] },
      { kind: "keep", radius: 1, points: [[0.5, 0.5], [0.5, 9.5]] },
    ]);
    expect(t[0]).toBe(FGD);
    expect(t[9 * 10]).toBe(FGD);
    expect(t[9]).toBe(BGD);
    expect(t[4 * 10 + 4]).toBe(BGD);
    expect(t[3 * 10 + 6]).toBe(PR_FGD);
  });
});

describe("grabCut", () => {
  it("keeps everything when there is nothing to decide", () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4).fill(200);
    const trimap = new Uint8Array(16).fill(FGD);
    expect([...grabCut(rgba, 4, 4, trimap)]).toEqual(new Array(16).fill(1));
    expect(() => grabCut(rgba, 4, 3, trimap)).toThrow();
  });

  it("product on a plain background: IoU ≥ 0.9 and a transparent PNG at the original size", async () => {
    const s = scene(W, H, plain, product);
    const { alpha, info } = await cut(s, RECT);
    expect([info.width, info.height, info.channels]).toEqual([W, H, 4]);
    expect(iou(alpha, s.ref)).toBeGreaterThanOrEqual(0.9);
    expect(alpha[0]).toBe(0);
    expect(alpha[200 * W + 320]).toBe(255);
    expect(alpha[350 * W + 320]).toBe(255);
  }, 60_000);

  it("product on a textured background: IoU ≥ 0.9", async () => {
    const s = scene(W, H, textured, product, 11);
    const { alpha } = await cut(s, RECT);
    expect(iou(alpha, s.ref)).toBeGreaterThanOrEqual(0.9);
  }, 60_000);

  it("flat colors from a JPEG (no sensor noise), default rectangle: no halo of background, IoU ≥ 0.95", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#8fc7a0"/><ellipse cx="320" cy="220" rx="150" ry="120" fill="red"/></svg>`;
    const { data } = await sharp(await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const ref = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ref[y * W + x] = ((x + 0.5 - 320) / 150) ** 2 + ((y + 0.5 - 220) / 120) ** 2 <= 1 ? 255 : 0;
    const { alpha } = await cut({ rgba: new Uint8ClampedArray(data), ref, width: W, height: H }, initialRect({ width: W, height: H }));
    expect(iou(alpha, ref)).toBeGreaterThanOrEqual(0.95);
  }, 60_000);

  it("a 'keep' stroke brings back a part colored like the background", async () => {
    // A light label on the box, the same color as the wall behind.
    const labeled = (x: number, y: number) => {
      const c = product(x, y);
      if (c && x >= 260 && x < 380 && y >= 300 && y < 390) return plain();
      return c;
    };
    const s = scene(W, H, plain, labeled, 3);
    const before = await cut(s, RECT);
    const fixed = await cut(s, RECT, [{ kind: "keep", radius: 14, points: [[275, 320], [365, 320], [365, 370], [275, 370]] }]);
    expect(iou(fixed.alpha, s.ref)).toBeGreaterThan(iou(before.alpha, s.ref));
    expect(iou(fixed.alpha, s.ref)).toBeGreaterThanOrEqual(0.9);
    expect(fixed.alpha[345 * W + 320]).toBe(255);
  }, 60_000);

  it("a 'remove' stroke takes out a second object inside the rectangle", async () => {
    // A red cup next to the product, also inside the rectangle.
    const cupInside = (x: number, y: number) => (Math.hypot(x - 445, y - 100) < 22 ? ([200, 50, 40] as [number, number, number]) : null);
    const s = scene(W, H, plain, (x, y) => product(x, y) ?? cupInside(x, y), 5);
    const ref = Uint8Array.from(s.ref);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!product(x + 0.5, y + 0.5)) ref[y * W + x] = 0;
    const before = await cut(s, RECT);
    expect(before.alpha[100 * W + 445]).toBe(255);
    const fixed = await cut(s, RECT, [{ kind: "remove", radius: 12, points: [[435, 100], [455, 100]] }]);
    expect(fixed.alpha[100 * W + 445]).toBe(0);
    expect(iou(fixed.alpha, ref)).toBeGreaterThanOrEqual(0.9);
  }, 60_000);
});
