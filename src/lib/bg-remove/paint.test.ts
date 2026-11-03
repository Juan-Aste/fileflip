import { describe, expect, it } from "vitest";
import { applyMask } from "./cutout";
import { applyPaint, coverage, strokeBox, type PaintStroke } from "./paint";

const hard = (points: [number, number][], radius = 5, kind: PaintStroke["kind"] = "erase"): PaintStroke => ({ kind, radius, soft: false, points });

describe("erase/restore brushes", () => {
  it("hard brush: full inside, one pixel of antialiasing, nothing outside", () => {
    const s = hard([[10, 10], [30, 10]], 5);
    expect(coverage(s, 20, 10)).toBe(1);
    expect(coverage(s, 20, 14)).toBe(1);
    expect(coverage(s, 20, 15.25)).toBeCloseTo(0.25);
    expect(coverage(s, 20, 16)).toBe(0);
    expect(coverage(s, 40, 10)).toBe(0);
  });

  it("soft brush fades over the outer half", () => {
    const s: PaintStroke = { ...hard([[0, 0]], 10), soft: true };
    expect(coverage(s, 4, 0)).toBe(1);
    const mid = coverage(s, 7.5, 0);
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.8);
    expect(coverage(s, 10, 0)).toBe(0);
  });

  it("erase and restore change only the pixels under the brush, at any scale", () => {
    const W = 100, H = 80;
    for (const scale of [1, 0.5, 2]) {
      const w = Math.round(W * scale), h = Math.round(H * scale);
      const alpha = new Uint8Array(w * h).fill(255);
      const strokes = [hard([[20, 20], [40, 20]], 6), hard([[25, 20]], 3, "restore")];
      applyPaint(alpha, () => 255, w, h, scale, strokes);
      const box = strokeBox(strokes[0]!);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const ix = (x + 0.5) / scale, iy = (y + 0.5) / scale;
          const a = alpha[y * w + x]!;
          if (ix < box.x0 || ix > box.x1 || iy < box.y0 || iy > box.y1) expect(a).toBe(255);
        }
      const at = (ix: number, iy: number) => alpha[Math.floor(iy * scale) * w + Math.floor(ix * scale)]!;
      expect(at(35, 20)).toBe(0); // erased
      expect(at(25, 20)).toBe(255); // restored after
      expect(at(60, 60)).toBe(255);
    }
  });

  it("applyMask: the strokes are applied over the cut at full size", () => {
    const W = 40, H = 30;
    const rgba = new Uint8ClampedArray(W * H * 4).fill(200);
    const mask = new Uint8Array(4 * 3).fill(255); // keep everything
    const before = new Uint8ClampedArray(rgba);
    applyMask(rgba, W, H, mask, 4, 3, { kind: "transparent" }, [hard([[2, 2]], 3)]);
    let changed = 0;
    for (let p = 0; p < W * H; p++) if (rgba[p * 4 + 3] !== before[p * 4 + 3]) {
      changed++;
      const x = p % W, y = Math.floor(p / W);
      expect(Math.hypot(x + 0.5 - 2, y + 0.5 - 2)).toBeLessThanOrEqual(4);
    }
    expect(changed).toBeGreaterThan(10);
    expect(rgba[(2 * W + 2) * 4 + 3]).toBe(0);
    // Over a color: the erased spot becomes that color, opaque.
    const c = new Uint8ClampedArray(W * H * 4).fill(200);
    applyMask(c, W, H, mask, 4, 3, { kind: "color", rgb: [0, 0, 255] }, [hard([[2, 2]], 3)]);
    expect([...c.subarray((2 * W + 2) * 4, (2 * W + 2) * 4 + 4)]).toEqual([0, 0, 255, 255]);
  });
});
