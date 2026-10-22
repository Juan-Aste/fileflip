import { describe, expect, it } from "vitest";
import { lithophaneGrid, lithophanePlan, lithophaneStl, lithophaneTriangles, MAX_LITHOPHANE_POINTS } from "./lithophane";

/** Triangles of a binary STL as [normal, a, b, c]. */
function triangles(stl: Uint8Array) {
  const view = new DataView(stl.buffer, stl.byteOffset, stl.byteLength);
  const count = view.getUint32(80, true);
  expect(stl.length).toBe(84 + count * 50);
  return Array.from({ length: count }, (_, i) => Array.from({ length: 4 }, (_, p) => [0, 1, 2].map((k) => view.getFloat32(84 + i * 50 + p * 12 + k * 4, true))));
}

describe("lithophane", () => {
  // 4 × 3 points: black left column, white right column, grey between.
  const gray = Float32Array.from([0, 0.5, 0.5, 1, 0, 0.5, 0.5, 1, 0, 0.5, 0.5, 1]);
  const stl = lithophaneStl(gray, 4, 3, { pixelMm: 1, minMm: 0.8, maxMm: 3.2, borderPx: 0 });
  const tris = triangles(stl);

  it("has the expected triangles, size and thickness per pixel", () => {
    expect(tris).toHaveLength(lithophaneTriangles(4, 3));
    const points = tris.flatMap((t) => t.slice(1));
    const axis = (k: number) => [Math.min(...points.map((p) => p[k]!)), Math.max(...points.map((p) => p[k]!))];
    expect(axis(0)).toEqual([0, 3]);
    expect(axis(1)).toEqual([0, 2]);
    expect(axis(2)[0]).toBe(0);
    expect(axis(2)[1]).toBeCloseTo(3.2);
    const heightAt = (x: number) => Math.max(...points.filter((p) => p[0] === x).map((p) => p[2]!));
    expect(heightAt(0)).toBeCloseTo(3.2); // black: thickest
    expect(heightAt(1)).toBeCloseTo(2.0);
    expect(heightAt(3)).toBeCloseTo(0.8); // white: thinnest
  });

  it("is watertight with outward normals (every edge shared by two triangles in opposite directions)", () => {
    const key = (p: number[]) => p.map((v) => v.toFixed(4)).join(",");
    const edges = new Map<string, number>();
    for (const [, a, b, c] of tris) {
      for (const [p, q] of [[a!, b!], [b!, c!], [c!, a!]]) edges.set(`${key(p)}>${key(q)}`, (edges.get(`${key(p)}>${key(q)}`) ?? 0) + 1);
    }
    for (const [edge, n] of edges) {
      expect(n, edge).toBe(1);
      const [p, q] = edge.split(">");
      expect(edges.get(`${q}>${p}`), `reverse of ${edge}`).toBe(1);
    }
    // Signed volume (divergence theorem) is positive when the normals point out: plate 3 × 2 mm, 0.8–3.2 mm thick.
    const volume = tris.reduce((sum, [, a, b, c]) => sum + (a![0]! * (b![1]! * c![2]! - b![2]! * c![1]!) - a![1]! * (b![0]! * c![2]! - b![2]! * c![0]!) + a![2]! * (b![0]! * c![1]! - b![1]! * c![0]!)) / 6, 0);
    expect(volume).toBeGreaterThan(3 * 2 * 0.8);
    expect(volume).toBeLessThan(3 * 2 * 3.2);
  });

  it("a border keeps the frame at the maximum thickness", () => {
    const framed = triangles(lithophaneStl(new Float32Array(25).fill(1), 5, 5, { pixelMm: 1, minMm: 0.8, maxMm: 3.2, borderPx: 1 })).flatMap((t) => t.slice(1));
    const at = (x: number, y: number) => Math.max(...framed.filter((p) => p[0] === x && p[1] === y).map((p) => p[2]!));
    expect(at(0, 0)).toBeCloseTo(3.2);
    expect(at(2, 2)).toBeCloseTo(0.8);
  });

  it("sizes the grid from the plate width and keeps tall pictures under the point cap", () => {
    expect(lithophaneGrid(400, 300, 100, 0.4)).toEqual({ columns: 251, rows: 189 });
    const tall = lithophanePlan(100, 1000, 150, 0.2);
    expect(tall.columns * tall.rows).toBeLessThanOrEqual(MAX_LITHOPHANE_POINTS);
    expect(tall.pixelMm).toBeGreaterThan(0.2);
    expect(lithophanePlan(400, 300, 100, 0.4).pixelMm).toBeCloseTo(0.4);
  });
});
