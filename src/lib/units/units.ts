// Unit conversion with exact definitions (international yard and pound, US
// customary volumes, SI and binary data prefixes). Each unit is a factor to
// the category's base unit, except temperatures, which have an offset.

export const unitCategories = ["length", "mass", "temperature", "volume", "area", "speed", "data", "time"] as const;
export type UnitCategory = (typeof unitCategories)[number];

interface Unit {
  id: string;
  symbol: string;
  /** Value in the base unit = value × factor (+ offset for temperatures). */
  factor: number;
  offset?: number;
}

const u = (id: string, symbol: string, factor: number, offset?: number): Unit => ({ id, symbol, factor, ...(offset !== undefined ? { offset } : {}) });

export const units: Record<UnitCategory, readonly Unit[]> = {
  length: [
    u("mm", "mm", 0.001),
    u("cm", "cm", 0.01),
    u("m", "m", 1),
    u("km", "km", 1000),
    u("in", "in", 0.0254),
    u("ft", "ft", 0.3048),
    u("yd", "yd", 0.9144),
    u("mi", "mi", 1609.344),
    u("nmi", "NM", 1852),
  ],
  mass: [
    u("mg", "mg", 1e-6),
    u("g", "g", 0.001),
    u("kg", "kg", 1),
    u("t", "t", 1000),
    u("oz", "oz", 0.028349523125),
    u("lb", "lb", 0.45359237),
    u("st", "st", 6.35029318),
  ],
  // Base: kelvin.
  temperature: [u("c", "°C", 1, 273.15), u("f", "°F", 5 / 9, 459.67 * (5 / 9)), u("k", "K", 1)],
  volume: [
    u("ml", "mL", 0.001),
    u("l", "L", 1),
    u("m3", "m³", 1000),
    u("tsp", "tsp", 0.00492892159375),
    u("tbsp", "tbsp", 0.01478676478125),
    u("floz", "fl oz", 0.0295735295625),
    u("cup", "cup", 0.2365882365),
    u("pt", "pt", 0.473176473),
    u("qt", "qt", 0.946352946),
    u("gal", "gal", 3.785411784),
    u("ukgal", "gal (UK)", 4.54609),
  ],
  area: [
    u("cm2", "cm²", 1e-4),
    u("m2", "m²", 1),
    u("ha", "ha", 1e4),
    u("km2", "km²", 1e6),
    u("in2", "in²", 0.00064516),
    u("ft2", "ft²", 0.09290304),
    u("yd2", "yd²", 0.83612736),
    u("ac", "ac", 4046.8564224),
    u("mi2", "mi²", 2589988.110336),
  ],
  speed: [u("ms", "m/s", 1), u("kmh", "km/h", 1 / 3.6), u("mph", "mph", 0.44704), u("kn", "kn", 1852 / 3600), u("fts", "ft/s", 0.3048)],
  data: [
    u("bit", "bit", 0.125),
    u("b", "B", 1),
    u("kb", "kB", 1e3),
    u("mb", "MB", 1e6),
    u("gb", "GB", 1e9),
    u("tb", "TB", 1e12),
    u("kib", "KiB", 1024),
    u("mib", "MiB", 1024 ** 2),
    u("gib", "GiB", 1024 ** 3),
    u("tib", "TiB", 1024 ** 4),
  ],
  time: [
    u("ms", "ms", 0.001),
    u("s", "s", 1),
    u("min", "min", 60),
    u("h", "h", 3600),
    u("d", "d", 86400),
    u("wk", "wk", 604800),
    // Gregorian year: 365.2425 days.
    u("yr", "yr", 31556952),
  ],
};

export function findUnit(category: UnitCategory, id: string): Unit {
  const unit = units[category].find((x) => x.id === id);
  if (!unit) throw new Error(`Unknown unit ${category}/${id}`);
  return unit;
}

export function convertUnit(value: number, category: UnitCategory, from: string, to: string): number {
  const a = findUnit(category, from);
  const b = findUnit(category, to);
  if (a === b) return value;
  const base = value * a.factor + (a.offset ?? 0);
  return (base - (b.offset ?? 0)) / b.factor;
}

/**
 * Reads a number typed by a person: "1,5" and "1.5" are both 1.5; with both
 * separators the last one is the decimal mark ("1.234,5" and "1,234.5").
 * Returns null for anything else.
 */
export function parseDecimal(input: string): number | null {
  let text = input.trim().replace(/[\s\u00a0\u202f']/g, "");
  if (!/^[+-]?[\d.,]*\d[\d.,]*(e[+-]?\d+)?$/i.test(text)) return null;
  // "1.234.567" or "1,234,567": thousands groups of exactly three digits.
  const grouped = (integer: string, separator: string) => new RegExp(`^[+-]?\\d{1,3}(\\${separator}\\d{3})+$`).test(integer);
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    const [decimal, thousands] = lastComma > lastDot ? [",", "."] : [".", ","];
    const at = text.lastIndexOf(decimal);
    if (!grouped(text.slice(0, at), thousands)) return null;
    text = `${text.slice(0, at).replaceAll(thousands, "")}.${text.slice(at + 1)}`;
  } else {
    const separator = lastComma > -1 ? "," : ".";
    const count = text.split(separator).length - 1;
    if (count > 1) {
      if (!grouped(text, separator)) return null;
      text = text.replaceAll(separator, "");
    } else if (separator === ",") {
      // A single comma is the decimal mark (as in Spanish, Portuguese and French).
      text = text.replace(",", ".");
    }
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
