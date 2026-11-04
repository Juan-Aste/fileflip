import { describe, expect, it } from "vitest";
import { roundImage, roundPlan, type RoundSpec } from "./round";

function photo(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < width * height; p++) data.set([(p * 7) % 256, (p * 13) % 256, (p * 29) % 256, 255], p * 4);
  return { data, width, height };
}
const all = { tl: true, tr: true, br: true, bl: true };
const px = (img: { data: Uint8ClampedArray; width: number }, x: number, y: number) => [...img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)];

describe("round image", () => {
  it("rounded corners: corner transparent, center identical, soft edge, same size", () => {
    const src = photo(200, 120);
    const out = roundImage(src, { shape: "corners", radius: 30, unit: "px", corners: all }, { kind: "transparent" });
    expect([out.width, out.height]).toEqual([200, 120]);
    for (const [x, y] of [[0, 0], [199, 0], [199, 119], [0, 119]]) expect(px(out, x!, y!)[3]).toBe(0);
    for (const [x, y] of [[100, 60], [30, 5], [5, 60]]) expect(px(out, x!, y!)).toEqual(px(src, x!, y!));
    let soft = 0;
    for (let i = 3; i < out.data.length; i += 4) if (out.data[i]! > 0 && out.data[i]! < 255) soft++;
    expect(soft).toBeGreaterThan(4 * 20);
  });

  it("radius in % of the shorter side, and only some corners", () => {
    expect(roundPlan(200, 120, { shape: "corners", radius: 25, unit: "percent", corners: all }).radius).toBe(30);
    expect(roundPlan(200, 120, { shape: "corners", radius: 500, unit: "px", corners: all }).radius).toBe(60);
    const out = roundImage(photo(200, 120), { shape: "corners", radius: 20, unit: "px", corners: { tl: true, tr: false, br: true, bl: false } }, { kind: "transparent" });
    expect(px(out, 0, 0)[3]).toBe(0);
    expect(px(out, 199, 0)[3]).toBe(255);
    expect(px(out, 199, 119)[3]).toBe(0);
    expect(px(out, 0, 119)[3]).toBe(255);
  });

  it("circle: centered square crop that can be moved; ellipse keeps the size", () => {
    const src = photo(300, 200);
    const spec: RoundSpec = { shape: "circle", ellipse: false, focus: 0.5 };
    const out = roundImage(src, spec, { kind: "transparent" });
    expect([out.width, out.height]).toEqual([200, 200]);
    expect(px(out, 100, 100)).toEqual(px(src, 150, 100));
    expect(px(out, 0, 0)[3]).toBe(0);
    expect(px(out, 100, 0)[3]).toBeGreaterThan(0);
    const left = roundImage(src, { ...spec, focus: 0 }, { kind: "transparent" });
    expect(px(left, 100, 100)).toEqual(px(src, 100, 100));
    const ellipse = roundImage(src, { shape: "circle", ellipse: true, focus: 0.5 }, { kind: "transparent" });
    expect([ellipse.width, ellipse.height]).toEqual([300, 200]);
    expect(px(ellipse, 150, 100)).toEqual(px(src, 150, 100));
    expect(px(ellipse, 2, 100)[3]).toBeGreaterThan(200);
    expect(px(ellipse, 0, 0)[3]).toBe(0);
  });

  it("over a color: corners are exactly that color, everything opaque, center untouched", () => {
    const src = photo(100, 100);
    const out = roundImage(src, { shape: "corners", radius: 25, unit: "px", corners: all }, { kind: "color", rgb: [10, 200, 30] });
    expect(px(out, 0, 0)).toEqual([10, 200, 30, 255]);
    expect(px(out, 50, 50)).toEqual(px(src, 50, 50));
    for (let i = 3; i < out.data.length; i += 4) expect(out.data[i]).toBe(255);
  });
});
