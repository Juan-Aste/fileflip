import { describe, expect, it } from "vitest";
import { adaptiveThreshold, defaultQuad, enhancedGray, homography, isValidQuad, project, scanSize, warpQuad, type Quad } from "./scan";

const image = (w: number, h: number, color: (x: number, y: number) => [number, number, number]) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set([...color(x, y), 255], (y * w + x) * 4);
  return { data, width: w, height: h };
};
const px = (img: { data: Uint8ClampedArray; width: number }, x: number, y: number) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)];

describe("homography", () => {
  it("maps each corner to its target and keeps straight lines", () => {
    const src: Quad = [{ x: 10, y: 20 }, { x: 300, y: 5 }, { x: 320, y: 400 }, { x: 0, y: 380 }];
    const dst: Quad = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 300 }, { x: 0, y: 300 }];
    const h = homography(src, dst);
    src.forEach((p, i) => {
      const q = project(h, p.x, p.y);
      expect(q.x).toBeCloseTo(dst[i]!.x, 6);
      expect(q.y).toBeCloseTo(dst[i]!.y, 6);
    });
    // The midpoint of a side lands on the target side.
    expect(project(h, 155, 12.5).y).toBeCloseTo(0, 6);
  });
});

describe("quads", () => {
  it("accepts clockwise convex quads and refuses crossed, flat or tiny ones", () => {
    expect(isValidQuad(defaultQuad(1000, 800), 1000, 800)).toBe(true);
    const [a, b, c, d] = defaultQuad(1000, 800);
    expect(isValidQuad([a, c, b, d], 1000, 800), "crossed").toBe(false);
    expect(isValidQuad([a, d, c, b], 1000, 800), "counter-clockwise").toBe(false);
    expect(isValidQuad([a, { x: 500, y: 48 }, b, c], 1000, 800), "three in a row").toBe(false);
    expect(isValidQuad([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }, { x: 0, y: 5 }], 1000, 800), "tiny").toBe(false);
    expect(isValidQuad([a, b, c, { x: -50, y: 700 }], 1000, 800), "outside").toBe(false);
  });

  it("sizes the page from its sides, capped", () => {
    expect(scanSize([{ x: 0, y: 0 }, { x: 210, y: 0 }, { x: 210, y: 297 }, { x: 0, y: 297 }])).toEqual({ width: 210, height: 297 });
    expect(scanSize([{ x: 0, y: 0 }, { x: 2100, y: 0 }, { x: 2100, y: 2970 }, { x: 0, y: 2970 }], 1000)).toEqual({ width: 707, height: 1000 });
  });
});

describe("warpQuad", () => {
  it("straightens a tilted page: what was inside the quad fills the output", () => {
    // A 400 × 400 photo: grey table, a red trapezoid "page" with a blue square in its top-left quarter.
    const page: Quad = [{ x: 100, y: 50 }, { x: 300, y: 70 }, { x: 340, y: 350 }, { x: 60, y: 330 }];
    const toPage = homography(page, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]);
    const photo = image(400, 400, (x, y) => {
      const p = project(toPage, x + 0.5, y + 0.5);
      if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return [128, 128, 128];
      return p.x < 0.5 && p.y < 0.5 ? [0, 0, 255] : [255, 0, 0];
    });
    const out = warpQuad(photo, page, { width: 200, height: 280 });
    expect(px(out, 50, 70), "blue quarter").toEqual([0, 0, 255]);
    expect(px(out, 150, 70)).toEqual([255, 0, 0]);
    expect(px(out, 150, 210)).toEqual([255, 0, 0]);
    expect(px(out, 50, 210)).toEqual([255, 0, 0]);
    // No grey table left anywhere in the middle of the edges.
    for (const [x, y] of [[100, 2], [197, 140], [100, 277], [2, 140]]) expect(px(out, x!, y!), `edge ${x},${y}`).not.toEqual([128, 128, 128]);
  });
});

describe("black and white", () => {
  it("keeps dark text black and an unevenly lit page white", () => {
    // Light falls off from 250 (left) to 120 (right); a text line, 60 darker than the paper around it, crosses the page.
    const photo = image(400, 300, (x, y) => {
      const paper = 250 - (x / 400) * 130;
      const ink = y >= 140 && y < 150 && x % 20 < 12;
      const v = ink ? paper - 60 : paper;
      return [v, v, v];
    });
    const bw = adaptiveThreshold(photo);
    expect(px(bw, 5, 145), "ink in the bright part").toEqual([0, 0, 0]);
    expect(px(bw, 385, 145), "ink in the dark part").toEqual([0, 0, 0]);
    expect(px(bw, 390, 40), "paper in the shadow stays white").toEqual([255, 255, 255]);
    expect(px(bw, 10, 260)).toEqual([255, 255, 255]);
    let black = 0;
    for (let i = 0; i < bw.data.length; i += 4) if (bw.data[i] === 0) black++;
    expect(black / (400 * 300), "only the text is black").toBeLessThan(0.03);
  });

  it("stretches grey contrast", () => {
    const gray = enhancedGray(image(100, 1, (x) => [80 + x, 80 + x, 80 + x]));
    expect(px(gray, 0, 0)[0]).toBe(0);
    expect(px(gray, 99, 0)[0]).toBe(255);
  });
});
