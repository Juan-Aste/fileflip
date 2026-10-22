// A parsed DXF drawing → SVG: Y flipped (DXF goes up), one <path> per shape,
// texts as <text>, and a real-world size (mm, cm, in) when the file says its units.
import type { Drawing, DrawText } from "./dxf";

export interface SvgOptions {
  /** White background (lines are drawn dark, as on paper) instead of transparent. */
  background: boolean;
}

/** Margin around the drawing, as a share of its longest side. */
const MARGIN = 0.02;
/** Line width, as a share of the longest side. */
const LINE = 0.001;
/** Cap height of the sans-serif fonts viewers fall back to, as a share of the font size. */
const CAP_HEIGHT = 0.7;

/** Page size in an SVG unit: meters and feet aren't SVG units, so they become mm and in. */
const SIZE_UNIT: Record<NonNullable<Drawing["units"]>, [string, number]> = { mm: ["mm", 1], cm: ["cm", 1], m: ["mm", 1000], in: ["in", 1], ft: ["in", 12] };

const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

export interface Frame {
  /** viewBox size. */
  width: number;
  height: number;
  /** Drawing → frame coordinates (Y down). */
  x: (x: number) => number;
  y: (y: number) => number;
  line: number;
}

/** The drawing's box plus margins; a single point or a straight line still gets a visible frame. */
export function frameOf(drawing: Drawing): Frame {
  const [minX, minY, maxX, maxY] = drawing.bounds;
  const longest = Math.max(maxX - minX, maxY - minY) || 1;
  const pad = longest * MARGIN;
  return {
    width: maxX - minX + 2 * pad,
    height: maxY - minY + 2 * pad,
    x: (x) => x - minX + pad,
    y: (y) => maxY - y + pad,
    line: longest * LINE,
  };
}

export function drawingToSvg(drawing: Drawing, options: SvgOptions): string {
  const frame = frameOf(drawing);
  // Enough decimals for 1/100 000 of the drawing's size.
  const decimals = Math.min(6, Math.max(0, Math.ceil(-Math.log10(Math.max(frame.width, frame.height) / 1e5))));
  const n = (v: number) => {
    const s = v.toFixed(decimals);
    return decimals ? s.replace(/\.?0+$/, "") || "0" : s;
  };
  const [w, h] = (() => {
    if (drawing.units) {
      const [unit, factor] = SIZE_UNIT[drawing.units];
      return [`${n(frame.width * factor)}${unit}`, `${n(frame.height * factor)}${unit}`];
    }
    // Without units, the longest side is 1000 px.
    const k = 1000 / Math.max(frame.width, frame.height);
    return [n(frame.width * k), n(frame.height * k)];
  })();

  const out: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${n(frame.width)} ${n(frame.height)}">`,
  ];
  if (options.background) out.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);
  out.push(`<g fill="none" stroke-width="${n(frame.line)}" stroke-linecap="round" stroke-linejoin="round">`);
  for (const path of drawing.paths) {
    if (path.points.length === 1) {
      const [x, y] = path.points[0]!;
      out.push(`<circle cx="${n(frame.x(x))}" cy="${n(frame.y(y))}" r="${n(frame.line * 1.5)}" fill="${path.color}"/>`);
      continue;
    }
    const d = path.points.map(([x, y], i) => `${i ? "L" : "M"}${n(frame.x(x))} ${n(frame.y(y))}`).join("") + (path.closed ? "Z" : "");
    out.push(path.fill ? `<path d="${d}" fill="${path.color}" stroke="${path.color}"/>` : `<path d="${d}" stroke="${path.color}"/>`);
  }
  out.push(`</g>`);
  if (drawing.texts.length) {
    out.push(`<g font-family="Arial, Helvetica, sans-serif" stroke="none">`);
    for (const t of drawing.texts) out.push(textElement(t, frame, n));
    out.push(`</g>`);
  }
  out.push(`</svg>`, "");
  return out.join("\n");
}

function textElement(t: DrawText, frame: Frame, n: (v: number) => string): string {
  const x = n(frame.x(t.x));
  const y = n(frame.y(t.y));
  const degrees = (-t.rotation * 180) / Math.PI;
  const rotate = Math.abs(degrees) > 1e-9 ? ` transform="rotate(${n(degrees)} ${x} ${y})"` : "";
  const baseline = t.baseline === "alphabetic" ? "" : ` dominant-baseline="${t.baseline === "middle" ? "central" : "hanging"}"`;
  const anchor = t.align === "start" ? "" : ` text-anchor="${t.align}"`;
  return `<text x="${x}" y="${y}" font-size="${n(t.height / CAP_HEIGHT)}" fill="${t.color}"${anchor}${baseline}${rotate} xml:space="preserve">${escapeXml(t.text)}</text>`;
}
