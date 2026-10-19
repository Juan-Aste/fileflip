import type { Size } from "./dimensions";

/** Used when an SVG declares neither a size nor a viewBox. */
export const DEFAULT_SVG_SIZE = 1024;

// Absolute CSS units converted to px; relative ones (%, em) can't be resolved.
const UNIT_PX: Record<string, number> = { "": 1, px: 1, pt: 4 / 3, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4 };

function length(value: string | undefined): number | null {
  const match = value?.trim().match(/^([\d.]+)\s*(px|pt|pc|in|cm|mm)?$/i);
  if (!match) return null;
  const n = parseFloat(match[1]) * UNIT_PX[(match[2] ?? "").toLowerCase()];
  return n > 0 && Number.isFinite(n) ? n : null;
}

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
}

/** Intrinsic size of an SVG from its root element's width/height/viewBox. */
export function svgIntrinsicSize(svg: string): Size {
  const tag = svg.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const width = length(attr(tag, "width"));
  const height = length(attr(tag, "height"));
  const box = attr(tag, "viewBox")?.trim().split(/[\s,]+/).map(Number);
  const ratio = box && box.length === 4 && box[2] > 0 && box[3] > 0 ? box[2] / box[3] : null;

  if (width && height) return { width: Math.round(width), height: Math.round(height) };
  if (width && ratio) return { width: Math.round(width), height: Math.round(width / ratio) };
  if (height && ratio) return { width: Math.round(height * ratio), height: Math.round(height) };
  if (box && ratio) return { width: Math.round(box[2]), height: Math.round(box[3]) };
  return { width: DEFAULT_SVG_SIZE, height: DEFAULT_SVG_SIZE };
}
