// Color parsing and conversion between HEX, RGB, HSL and OKLCH (sRGB gamut),
// plus WCAG 2 contrast. OKLab math from Björn Ottosson's reference.
import { namedColors } from "./named";

/** sRGB channels 0–255 (may be fractional) and alpha 0–1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

function parseNumber(token: string, percentOf: number): number {
  const value = parseFloat(token);
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?%?$/i.test(token) || !Number.isFinite(value)) throw new Error("bad number");
  return token.endsWith("%") ? (value / 100) * percentOf : value;
}

function parseHue(token: string): number {
  const match = /^([+-]?(?:\d+\.?\d*|\.\d+))(deg|turn|rad|grad)?$/i.exec(token);
  if (!match) throw new Error("bad hue");
  const value = parseFloat(match[1]!);
  const unit = (match[2] ?? "deg").toLowerCase();
  const degrees = unit === "turn" ? value * 360 : unit === "rad" ? (value * 180) / Math.PI : unit === "grad" ? value * 0.9 : value;
  return ((degrees % 360) + 360) % 360;
}

/** Splits "r g b / a" or "r, g, b, a" into channel tokens and an optional alpha token. */
function args(inner: string): { channels: string[]; alpha?: string } {
  const [main = "", slash] = inner.split("/");
  const channels = main.trim().split(/\s*,\s*|\s+/).filter(Boolean);
  if (slash !== undefined) return { channels, alpha: slash.trim() };
  if (channels.length === 4) return { channels: channels.slice(0, 3), alpha: channels[3] };
  return { channels };
}

/** Parses a CSS color: #hex, rgb()/rgba(), hsl()/hsla(), oklch() or a named color. Returns null if it is not one. */
export function parseColor(input: string): Rgba | null {
  const text = input.trim().toLowerCase();
  try {
    const named = namedColors.get(text);
    if (named) return parseColor(`#${named}`);
    if (text === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
    const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text);
    if (hex) {
      let h = hex[1]!;
      if (h.length <= 4) h = [...h].map((c) => c + c).join("");
      const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
      return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? round(n(6) / 255, 3) : 1 };
    }
    const fn = /^(rgba?|hsla?|oklch)\((.*)\)$/.exec(text);
    if (!fn) return null;
    const { channels, alpha } = args(fn[2]!);
    if (channels.length !== 3) return null;
    const a = alpha === undefined ? 1 : clamp(parseNumber(alpha, 1), 0, 1);
    if (fn[1]!.startsWith("rgb")) {
      const [r, g, b] = channels.map((c) => clamp(parseNumber(c, 255), 0, 255)) as [number, number, number];
      return { r, g, b, a };
    }
    if (fn[1]!.startsWith("hsl")) {
      const h = parseHue(channels[0]!);
      const s = clamp(parseNumber(channels[1]!.endsWith("%") ? channels[1]! : `${channels[1]}%`, 1), 0, 1);
      const l = clamp(parseNumber(channels[2]!.endsWith("%") ? channels[2]! : `${channels[2]}%`, 1), 0, 1);
      return { ...hslToRgb(h, s, l), a };
    }
    const l = clamp(parseNumber(channels[0]!, 1), 0, 1);
    const c = Math.max(0, parseNumber(channels[1]!, 0.4));
    const h = channels[2] === "none" ? 0 : parseHue(channels[2]!);
    return { ...oklchToRgb(l, c, h), a };
  } catch {
    return null;
  }
}

function hslToRgb(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)));
  return { r: f(0), g: f(8), b: f(4) };
}

export function rgbToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return { h: ((h * 60) % 360 + 360) % 360, s, l };
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklch({ r, g, b }: Rgba): { l: number; c: number; h: number } {
  const [lr, lg, lb] = [r, g, b].map((v) => toLinear(v / 255)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  return { l: L, c, h: c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

/** OKLCH → sRGB; colors outside the sRGB gamut are clipped per channel. */
function oklchToRgb(L: number, C: number, H: number) {
  const A = C * Math.cos((H * Math.PI) / 180);
  const B = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const [r, g, b] = lin.map((c) => 255 * clamp(fromLinear(c), 0, 1)) as [number, number, number];
  return { r, g, b };
}

const hex2 = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");

/** CSS strings of the color in each notation (modern space-separated syntax). */
export function formatColor(color: Rgba) {
  const alpha = color.a < 1 ? round(color.a, 3) : null;
  const slash = alpha === null ? "" : ` / ${alpha}`;
  const hsl = rgbToHsl(color);
  const ok = rgbToOklch(color);
  return {
    hex: `#${hex2(color.r)}${hex2(color.g)}${hex2(color.b)}${alpha === null ? "" : hex2(color.a * 255)}`,
    rgb: `rgb(${Math.round(color.r)} ${Math.round(color.g)} ${Math.round(color.b)}${slash})`,
    hsl: `hsl(${round(hsl.h, 1)} ${round(hsl.s * 100, 1)}% ${round(hsl.l * 100, 1)}%${slash})`,
    oklch: `oklch(${round(ok.l * 100, 2)}% ${round(ok.c, 4)} ${round(ok.h, 2)}${slash})`,
  };
}

/** WCAG 2 relative luminance of an opaque color. */
export function luminance({ r, g, b }: Rgba): number {
  const [lr, lg, lb] = [r, g, b].map((v) => toLinear(v / 255)) as [number, number, number];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** Composites a translucent foreground over an opaque background. */
export function over(fg: Rgba, bg: Rgba): Rgba {
  return { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 };
}

/** WCAG 2 contrast ratio (1–21), with the text color composited over the background. */
export function contrast(text: Rgba, background: Rgba): number {
  const bg = { ...background, a: 1 };
  const [hi, lo] = [luminance(over(text, bg)), luminance(bg)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG 2.x levels for normal and large text. */
export function wcagLevels(ratio: number) {
  return { normalAA: ratio >= 4.5, normalAAA: ratio >= 7, largeAA: ratio >= 3, largeAAA: ratio >= 4.5 };
}
