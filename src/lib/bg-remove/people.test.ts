// Trimap of the "people" mode, built from a person probability like the one
// MediaPipe returns. Scenes and masks are generated here, so the right
// answer is known exactly; the model itself is tested in the e2e test.
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { downscale, iou, workSize } from "./cutout";
import { BGD, FGD, PR_BGD, PR_FGD } from "./grabcut";
import { bandWidth, edgeDistance, hasPerson, MIN_PERSON_SHARE, personConfidence, personShare, segmentPerson, trimapFromMask } from "./people";

const W = 160;
const H = 120;

/** A "person": head (circle) over shoulders (half ellipse), like a selfie. */
const person = (x: number, y: number) => Math.hypot(x - 80, y - 40) <= 22 || (y >= 62 && ((x - 80) / 60) ** 2 + ((y - 120) / 58) ** 2 <= 1);

function maskOf(f: (x: number, y: number) => boolean, w = W, h = H) {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = f(x + 0.5, y + 0.5) ? 255 : 0;
  return m;
}

describe("edgeDistance", () => {
  it("matches the true distance to the edge within the chamfer error", () => {
    // Left half inside: the distance is how far from the column x = 80.
    const inside = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < 80; x++) inside[y * W + x] = 1;
    const d = edgeDistance(inside, W, H);
    for (const x of [0, 40, 79, 80, 100, 159]) {
      const truth = x < 80 ? 80 - x : x - 79;
      expect(d[60 * W + x]).toBeCloseTo(truth, 5);
    }
  });

  it("is about the Euclidean distance on diagonals (≤ 8 % off)", () => {
    const inside = maskOf((x, y) => Math.hypot(x - 80, y - 60) <= 50).map((v) => (v ? 1 : 0));
    const d = edgeDistance(inside, W, H);
    const i = 60 * W + 80;
    expect(Math.abs(d[i]! - 50) / 50).toBeLessThan(0.08);
  });
});

describe("trimapFromMask", () => {
  const prob = maskOf(person);
  const band = bandWidth(W, H);

  it("keeps sure person inside, sure background far away and a band on the edge", () => {
    const t = trimapFromMask(prob, W, H);
    expect(band).toBe(6);
    expect(t[40 * W + 80]).toBe(FGD); // center of the head
    expect(t[100 * W + 80]).toBe(FGD); // chest
    expect(t[5 * W + 5]).toBe(BGD); // corner
    expect(t[40 * W + 80 + 21]).toBe(PR_FGD); // just inside the head's edge
    expect(t[40 * W + 80 + 23]).toBe(PR_BGD); // just outside it
    expect(t[40 * W + 80 + 30]).toBe(BGD); // well outside it
    // The undecided band is only around the edge: about its length × 2 band.
    const undecided = t.filter((v) => v === PR_FGD || v === PR_BGD).length;
    expect(undecided).toBeGreaterThan(0);
    expect(undecided / t.length).toBeLessThan(0.2);
  });

  it("follows the band width given", () => {
    const wide = trimapFromMask(prob, W, H, [], 10);
    expect(wide[40 * W + 80 + 15]).toBe(PR_FGD);
    expect(wide[40 * W + 80 + 30]).toBe(PR_BGD);
    expect(trimapFromMask(prob, W, H, [], 3)[40 * W + 80 + 15]).toBe(FGD);
  });

  it("paints the strokes on top, in order", () => {
    const t = trimapFromMask(prob, W, H, [
      { kind: "remove", radius: 5, points: [[80, 40]] },
      { kind: "keep", radius: 4, points: [[10, 10], [20, 10]] },
    ]);
    expect(t[40 * W + 80]).toBe(BGD);
    expect(t[10 * W + 15]).toBe(FGD);
    // Around the strokes the opposite "sure" label is now only "probably".
    expect(t[40 * W + 80 + 10]).toBe(PR_FGD);
    expect(t[10 * W + 30]).toBe(PR_BGD);
    expect(t[110 * W + 155]).toBe(BGD);
  });

  it("an empty mask gives only background (and no clear person)", () => {
    const empty = new Uint8Array(W * H);
    expect(trimapFromMask(empty, W, H).every((v) => v === BGD)).toBe(true);
    expect(personShare(empty)).toBeLessThan(MIN_PERSON_SHARE);
    expect(personShare(prob)).toBeGreaterThan(0.2);
  });

  it("tells a clear person from a faint patch", () => {
    expect(hasPerson(prob)).toBe(true);
    expect(personConfidence(prob)).toBe(1);
    // 4 % of the photo at 0.75 (like the model on a product photo): not a person.
    const faint = new Uint8Array(W * H);
    faint.fill(191, 0, Math.round(W * H * 0.04));
    expect(personShare(faint)).toBeGreaterThan(MIN_PERSON_SHARE);
    expect(hasPerson(faint)).toBe(false);
    expect(hasPerson(new Uint8Array(W * H))).toBe(false);
  });

  it("refuses a mask of the wrong size", () => {
    expect(() => trimapFromMask(new Uint8Array(10), W, H)).toThrow();
  });
});

describe("segmentPerson", () => {
  // Photo: the person in blue over a two-color background with stripes.
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const c = person(x + 0.5, y + 0.5) ? [30, 80, 170] : Math.floor((x + y) / 8) % 2 ? [200, 150, 90] : [110, 160, 90];
      rgba.set([...c, 255], i);
    }
  const truth = maskOf(person);

  it("puts the edge back where the colors change when the model is a little off", () => {
    // The model's mask: the person grown by 4 px and shifted 2 px (blurry edges).
    const off = maskOf((x, y) => {
      for (const [dx, dy] of [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4], [3, 3], [-3, 3], [3, -3], [-3, -3]] as const)
        if (person(x - 2 + dx, y + dy)) return true;
      return false;
    });
    const before = iou(off, truth);
    const after = iou(segmentPerson(rgba, W, H, off, []), truth);
    expect(before).toBeLessThan(0.9);
    expect(after).toBeGreaterThan(0.97);
  });

  it("a 'keep' stroke brings back what the model missed", () => {
    // The model misses the head: only the shoulders.
    const noHead = maskOf((x, y) => y >= 62 && person(x, y));
    const missed = iou(segmentPerson(rgba, W, H, noHead, []), truth);
    const fixed = iou(segmentPerson(rgba, W, H, noHead, [{ kind: "keep", radius: 6, points: [[80, 30], [80, 50]] }]), truth);
    expect(missed).toBeLessThan(0.9);
    expect(fixed).toBeGreaterThan(0.95);
  });
});

describe("segmentPerson on a real photo", () => {
  it("refines a coarse person mask of tests/fixtures/people/person.jpg (IoU ≥ 0.95)", async () => {
    const dir = join(__dirname, "../../../tests/fixtures/people");
    const { data, info } = await sharp(join(dir, "person.jpg")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const ws = workSize(info.width, info.height);
    const work = downscale(data, info.width, info.height, ws.width, ws.height);
    const ref = new Uint8Array(await sharp(join(dir, "person-mask.png")).resize(ws.width, ws.height).extractChannel(0).raw().toBuffer());
    // A blurry, low-resolution mask, like a model's 256 × 256 output scaled up (here 16 px wide).
    const tiny = await sharp(join(dir, "person-mask.png")).resize(16).png().toBuffer();
    const coarse = new Uint8Array(await sharp(tiny).resize(ws.width, ws.height, { kernel: "cubic" }).blur(3).extractChannel(0).raw().toBuffer());
    const before = iou(coarse, ref);
    const after = iou(segmentPerson(work, ws.width, ws.height, coarse, []), ref);
    expect(after).toBeGreaterThan(0.95);
    expect(after).toBeGreaterThan(before);
  });
});
