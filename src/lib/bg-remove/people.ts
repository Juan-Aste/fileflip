// "People" mode: the person mask from MediaPipe Selfie Segmenter (a
// probability per pixel) seeds the GrabCut trimap instead of a rectangle.
// Deep inside the person: subject for sure; far from it: background for
// sure; a band along the edge stays undecided, and GrabCut (with the colors
// of this photo) places the edge there. The user's "keep"/"remove" strokes
// go on top, as in the rectangle mode. Pure functions; the model runs in
// the people worker.

import { BGD, FGD, grabCut, paintStroke, PR_BGD, PR_FGD, type Stroke } from "./grabcut";
import { softMask } from "./cutout";

/** Share of the person (probability ≥ 0.5) under which we say there is no clear person. */
export const MIN_PERSON_SHARE = 0.01;

/** Width of the undecided band on each side of the model's edge, in work pixels. */
export function bandWidth(width: number, height: number): number {
  return Math.max(4, Math.round(Math.max(width, height) * 0.04));
}

/**
 * Chamfer (3-4) distance, in pixels, from each pixel to the nearest pixel
 * where `inside` differs: how deep it sits in its own region.
 */
export function edgeDistance(inside: Uint8Array, width: number, height: number): Float32Array {
  const n = width * height;
  const d = new Float32Array(n);
  const far = 3 * (width + height);
  for (let i = 0; i < n; i++) {
    const x = i % width;
    const y = (i - x) / width;
    const v = inside[i];
    // A pixel next to the other region is at distance 1.
    const edge =
      (x > 0 && inside[i - 1] !== v) ||
      (x < width - 1 && inside[i + 1] !== v) ||
      (y > 0 && inside[i - width] !== v) ||
      (y < height - 1 && inside[i + width] !== v);
    d[i] = edge ? 3 : far;
  }
  const relax = (i: number, j: number, cost: number) => {
    if (d[j]! + cost < d[i]!) d[i] = d[j]! + cost;
  };
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x > 0) relax(i, i - 1, 3);
      if (y > 0) {
        relax(i, i - width, 3);
        if (x > 0) relax(i, i - width - 1, 4);
        if (x < width - 1) relax(i, i - width + 1, 4);
      }
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x < width - 1) relax(i, i + 1, 3);
      if (y < height - 1) {
        relax(i, i + width, 3);
        if (x < width - 1) relax(i, i + width + 1, 4);
        if (x > 0) relax(i, i + width - 1, 4);
      }
    }
  for (let i = 0; i < n; i++) d[i] = d[i]! / 3;
  return d;
}

/** Share of the photo the model sees as person (probability ≥ 0.5, given as 0–255). */
export function personShare(prob: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < prob.length; i++) if (prob[i]! >= 128) count++;
  return prob.length === 0 ? 0 : count / prob.length;
}

/**
 * Person probability (0–255, work size) → GrabCut trimap: sure person more
 * than `band` pixels inside the edge, sure background more than `band`
 * pixels outside it, and "probably" (person or background, as the model
 * says) in between. Then the strokes, in order.
 */
export function trimapFromMask(prob: Uint8Array, width: number, height: number, strokes: readonly Stroke[] = [], band = bandWidth(width, height)): Uint8Array {
  const n = width * height;
  if (prob.length !== n) throw new Error("Wrong mask size");
  const inside = new Uint8Array(n);
  for (let i = 0; i < n; i++) inside[i] = prob[i]! >= 128 ? 1 : 0;
  const depth = edgeDistance(inside, width, height);
  const trimap = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (depth[i]! > band) trimap[i] = inside[i] ? FGD : BGD;
    else trimap[i] = inside[i] ? PR_FGD : PR_BGD;
  }
  for (const stroke of strokes) {
    // The model may have missed a whole part (or added one): around a stroke the
    // opposite "sure" label becomes "probably", so the cut can grow from the stroke.
    const sure = stroke.kind === "keep" ? BGD : FGD;
    const reach = { ...stroke, radius: Math.max(stroke.radius * 4, band * 2) };
    const area = new Uint8Array(n);
    paintStroke(area, width, height, { ...reach, kind: "keep" });
    for (let i = 0; i < n; i++) if (area[i] === FGD && trimap[i] === sure) trimap[i] = sure === BGD ? PR_BGD : PR_FGD;
    paintStroke(trimap, width, height, stroke);
  }
  return trimap;
}

/** Work copy + person probability + strokes → soft mask (0–255) of the work copy. */
export function segmentPerson(work: Uint8ClampedArray | Uint8Array, width: number, height: number, prob: Uint8Array, strokes: readonly Stroke[], iterations = 3) {
  const trimap = trimapFromMask(prob, width, height, strokes);
  return softMask(grabCut(work, width, height, trimap, iterations), width, height, 1);
}
