// Geometry for the admin panel's SVG charts. Pure functions, so the charts
// render on the server with no chart library and no client JavaScript.

/** A "nice" rounded maximum for the y axis (1, 2, 2.5, 5 × 10^n), at least 4 (counts). */
export function niceMax(max: number): number {
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= max) ?? 10;
  return step * magnitude;
}

/** Grid steps that keep tick values whole: 4 for 2/4 × 10^n maxima, 5 otherwise. */
export function tickCountFor(yMax: number): number {
  const lead = yMax / 10 ** Math.floor(Math.log10(yMax));
  return lead === 2 || lead === 4 ? 4 : 5;
}

export interface LinePoint {
  x: number;
  y: number;
  key: string;
  value: number;
}

export interface LineGeometry {
  points: LinePoint[];
  /** SVG path of the line ("M x y L x y ..."), empty without points. */
  path: string;
  /** Closed path of the area under the line. */
  area: string;
  yMax: number;
  /** Horizontal grid lines: value and y coordinate. */
  ticks: Array<{ value: number; y: number }>;
}

/**
 * Lays out a single series in a `width` × `height` plot area (y grows down,
 * the baseline is `height`). One point alone is centered.
 */
export function lineGeometry(series: Array<{ key: string; value: number }>, width: number, height: number): LineGeometry {
  const yMax = niceMax(Math.max(0, ...series.map((s) => s.value)));
  const tickCount = tickCountFor(yMax);
  const y = (v: number) => height - (v / yMax) * height;
  const stepX = series.length > 1 ? width / (series.length - 1) : 0;
  const points = series.map((s, i) => ({
    x: series.length > 1 ? i * stepX : width / 2,
    y: y(s.value),
    key: s.key,
    value: s.value,
  }));
  const r = (n: number) => Math.round(n * 10) / 10;
  const path = points.map((p, i) => `${i ? "L" : "M"}${r(p.x)} ${r(p.y)}`).join(" ");
  const area = points.length ? `${path} L${r(points.at(-1)!.x)} ${height} L${r(points[0].x)} ${height} Z` : "";
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const value = (yMax / tickCount) * i;
    return { value, y: r(y(value)) };
  });
  return { points, path, area, yMax, ticks };
}

/** Indexes of the x labels to show: first, last and evenly spaced ones in between (at most `max`). */
export function labelIndexes(count: number, max = 6): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => Math.round(i * step));
}

/** Bar length of each row as a share (0–1) of the largest one. */
export function barShares(rows: Array<{ count: number }>): number[] {
  const max = Math.max(0, ...rows.map((r) => r.count));
  return rows.map((r) => (max > 0 ? r.count / max : 0));
}
