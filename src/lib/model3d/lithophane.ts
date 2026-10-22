// Image → lithophane: a plate whose thickness follows the darkness of each
// pixel (dark = thick, so less light passes), written as a watertight binary
// STL. Pure geometry: the worker decodes and scales the image first.

export interface LithophaneOptions {
  /** Millimetres between two grid points (one per pixel of the scaled image). */
  pixelMm: number;
  /** Thickness of white and black, in millimetres. */
  minMm: number;
  maxMm: number;
  /** Solid frame around the picture, at the maximum thickness, in pixels (0 = none). */
  borderPx: number;
}

/** Plate widths offered (mm), detail levels (mm per pixel) and thickness presets (white–black, mm). */
export const lithophaneWidths = [80, 100, 150] as const;
export const lithophaneDetails = { normal: 0.4, fine: 0.2 } as const;
export const lithophaneThickness = { thin: [0.6, 2.4], standard: [0.8, 3.2], thick: [1.2, 4.0] } as const;
export const LITHOPHANE_BORDER_MM = 2;
/** Grid points: 750 × 750 at most (a 150 mm plate at 0.2 mm), about 1.1 million triangles. */
export const MAX_LITHOPHANE_POINTS = 750 * 750;

/** Grid size for an image of `width`×`height` on a plate `plateMm` wide at `pixelMm` per point (at least 2×2). */
export function lithophaneGrid(width: number, height: number, plateMm: number, pixelMm: number) {
  const columns = Math.max(2, Math.round(plateMm / pixelMm) + 1);
  const rows = Math.max(2, Math.round(((columns - 1) * height) / width) + 1);
  return { columns, rows };
}

/** Triangles of a plate with `columns`×`rows` points: the relief, and per border segment a side wall (2) and a back triangle. */
export const lithophaneTriangles = (columns: number, rows: number) => 2 * (columns - 1) * (rows - 1) + 6 * (columns - 1 + rows - 1);

/**
 * Binary STL of a lithophane. `gray` has `columns`×`rows` values from 0 (black)
 * to 1 (white), row 0 at the top of the picture. The picture reads correctly
 * from the relief side (+Z), x to the right and y up.
 */
export function lithophaneStl(gray: Float32Array, columns: number, rows: number, options: LithophaneOptions): Uint8Array {
  const { pixelMm, minMm, maxMm, borderPx } = options;
  const height = (c: number, r: number) => {
    if (c < borderPx || r < borderPx || c >= columns - borderPx || r >= rows - borderPx) return maxMm;
    return minMm + (1 - Math.min(1, Math.max(0, gray[r * columns + c]!))) * (maxMm - minMm);
  };
  const x = (c: number) => c * pixelMm;
  const y = (r: number) => (rows - 1 - r) * pixelMm;
  const triangles = lithophaneTriangles(columns, rows);
  const out = new Uint8Array(84 + triangles * 50);
  const view = new DataView(out.buffer);
  new TextEncoder().encodeInto("Fileflect lithophane", out);
  view.setUint32(80, triangles, true);
  let offset = 84;
  const tri = (a: number[], b: number[], c: number[]) => {
    const u = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
    const v = [c[0]! - a[0]!, c[1]! - a[1]!, c[2]! - a[2]!];
    const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
    const length = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    for (const value of [...n.map((k) => k / length), ...a, ...b, ...c]) {
      view.setFloat32(offset, value, true);
      offset += 4;
    }
    offset += 2; // attribute byte count
  };
  const top = (c: number, r: number) => [x(c), y(r), height(c, r)];
  const bottom = (c: number, r: number) => [x(c), y(r), 0];

  // Relief, counter-clockwise seen from above (+Z).
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < columns - 1; c++) {
      tri(top(c, r), top(c, r + 1), top(c + 1, r + 1));
      tri(top(c, r), top(c + 1, r + 1), top(c + 1, r));
    }
  }
  // The border, clockwise seen from above (= counter-clockwise from outside the plate): each segment gets a side wall
  // (two triangles) and a back triangle fanned from the centre, so every edge is shared by exactly two triangles.
  const ring: [number, number][] = [];
  for (let c = 0; c < columns - 1; c++) ring.push([c, 0]);
  for (let r = 0; r < rows - 1; r++) ring.push([columns - 1, r]);
  for (let c = columns - 1; c > 0; c--) ring.push([c, rows - 1]);
  for (let r = rows - 1; r > 0; r--) ring.push([0, r]);
  const centre = [x(columns - 1) / 2, y(0) / 2, 0];
  for (let i = 0; i < ring.length; i++) {
    const [c0, r0] = ring[i]!;
    const [c1, r1] = ring[(i + 1) % ring.length]!;
    tri(top(c0, r0), top(c1, r1), bottom(c1, r1));
    tri(top(c0, r0), bottom(c1, r1), bottom(c0, r0));
    tri(centre, bottom(c0, r0), bottom(c1, r1));
  }
  if (offset !== out.length) throw new Error("lithophane size mismatch");
  return out;
}

/** Grid for the plate, coarser than asked when the picture is so tall that it would pass MAX_LITHOPHANE_POINTS. */
export function lithophanePlan(width: number, height: number, plateMm: number, pixelMm: number) {
  let grid = lithophaneGrid(width, height, plateMm, pixelMm);
  let pitch = pixelMm;
  while (grid.columns * grid.rows > MAX_LITHOPHANE_POINTS) {
    pitch *= Math.sqrt((grid.columns * grid.rows) / MAX_LITHOPHANE_POINTS) * 1.01;
    grid = lithophaneGrid(width, height, plateMm, pitch);
  }
  return { ...grid, pixelMm: plateMm / (grid.columns - 1) };
}
