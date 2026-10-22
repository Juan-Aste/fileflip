// Unix timestamps ↔ dates, in UTC and in any IANA time zone. Pure functions
// over Intl, so results match the browser's own time zone database.
import { ConversionError, TextPositionError } from "@/lib/convert-error";

export type TimestampUnit = "auto" | "s" | "ms" | "us" | "ns";

/** ±100,000,000 days around 1970: the range of a JavaScript Date. */
const MAX_MS = 8.64e15;
export const MAX_TIMESTAMP_LINES = 10_000;

const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, "0");

function wallClock(epochMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    era: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(epochMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // 1 BC is year 0 in ISO 8601 (astronomical numbering).
  const year = get("era") === "BC" ? 1 - Number(get("year")) : Number(get("year"));
  return { year, month: Number(get("month")), day: Number(get("day")), hour: Number(get("hour")), minute: Number(get("minute")), second: Number(get("second")) };
}

/** A proleptic Gregorian date as UTC milliseconds, also for years 0–99 (which Date.UTC maps to 19xx). */
function utcMs(year: number, month: number, day: number, hour: number, minute: number, second: number, ms: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, ms);
  return date.getTime();
}

/** Offset of the zone from UTC at that instant, in minutes (e.g. -180 for Buenos Aires). */
export function zoneOffsetMinutes(epochMs: number, timeZone: string): number {
  const w = wallClock(epochMs, timeZone);
  return Math.round((utcMs(w.year, w.month, w.day, w.hour, w.minute, w.second, 0) - Math.floor(epochMs / 1000) * 1000) / 60_000);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** "2023-11-14 19:13:20.000" in the zone, plus its "UTC−03:00" offset. */
export function formatInZone(epochMs: number, timeZone: string): { local: string; offset: string } {
  const w = wallClock(epochMs, timeZone);
  const ms = ((epochMs % 1000) + 1000) % 1000;
  const offset = zoneOffsetMinutes(epochMs, timeZone);
  const year = w.year < 0 ? `-${pad(w.year, 6)}` : w.year > 9999 ? `+${pad(w.year, 6)}` : pad(w.year, 4);
  return {
    local: `${year}-${pad(w.month)}-${pad(w.day)} ${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}.${pad(ms, 3)}`,
    offset: `UTC${offset < 0 ? "-" : "+"}${pad(Math.trunc(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`,
  };
}

const ISO =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;
const RFC_2822 = /^(?:[A-Za-z]{3},\s*)?\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}(?::\d{2})?\s+(?:GMT|UTC|UT|Z|[+-]\d{4})$/;

/** Epoch milliseconds of a wall-clock time in a zone (the earlier one when the clock repeats). */
function wallToEpoch(wall: number, timeZone: string): number {
  // Two passes settle DST changes: the offset at the guess, then at the corrected instant.
  const guess = wall - zoneOffsetMinutes(wall, timeZone) * 60_000;
  return wall - zoneOffsetMinutes(guess, timeZone) * 60_000;
}

/** A number of seconds/ms/µs/ns, or a date (ISO 8601 or RFC 2822); dates without an offset are in `timeZone`. */
export function parseTimestamp(value: string, unit: TimestampUnit, timeZone: string): number {
  const text = value.trim();
  const number = /^[+-]?\d+(?:\.\d+)?$/.test(text);
  if (number) {
    const [whole = "", fraction = ""] = text.replace(/^[+-]/, "").split(".");
    const digits = whole.replace(/^0+(?=\d)/, "").length;
    const resolved: Exclude<TimestampUnit, "auto"> =
      unit !== "auto" ? unit : digits <= 11 ? "s" : digits <= 14 ? "ms" : digits <= 17 ? "us" : "ns";
    // BigInt keeps nanosecond inputs exact; the fraction is only kept down to the millisecond.
    const [scale, divide] = { s: [1000, 1], ms: [1, 1], us: [1, 1000], ns: [1, 1_000_000] }[resolved].map(BigInt) as [bigint, bigint];
    const fractionMs = BigInt(resolved === "s" ? (fraction + "000").slice(0, 3) : 0);
    const ms = (text.startsWith("-") ? -1 : 1) * Number((BigInt(whole) * scale) / divide + fractionMs);
    if (Math.abs(ms) > MAX_MS) throw new ConversionError("invalidData");
    return ms;
  }
  const iso = ISO.exec(text);
  if (iso) {
    const [, y, mo, d, h = "0", mi = "0", s = "0", frac = "", zone] = iso;
    const [year, month, day, hour, minute, second] = [y, mo, d, h, mi, s].map(Number) as [number, number, number, number, number, number];
    if (hour > 23 || minute > 59 || second > 59) throw new ConversionError("invalidData");
    const wall = utcMs(year, month, day, hour, minute, second, Number((frac + "000").slice(0, 3)));
    // Rejects impossible dates such as 2023-02-29 or 2024-13-01 (Date would roll them over).
    const check = new Date(wall);
    if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new ConversionError("invalidData");
    if (!zone) return wallToEpoch(wall, timeZone);
    if (/^z$/i.test(zone)) return wall;
    const digits = zone.replace(":", "");
    const offset = (zone.startsWith("-") ? -1 : 1) * (Number(digits.slice(1, 3)) * 60 + Number(digits.slice(3, 5) || "0"));
    return wall - offset * 60_000;
  }
  if (RFC_2822.test(text)) {
    const ms = Date.parse(text.replace(/\bUTC\b|\bUT\b|\bZ$/, "GMT"));
    if (!Number.isNaN(ms)) return ms;
  }
  throw new ConversionError("invalidData");
}

const csvField = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/**
 * One CSV row per non-empty line: the input, Unix seconds and milliseconds,
 * ISO 8601 in UTC and the time in the chosen zone with its offset. A line
 * that is not a timestamp fails with its line number.
 */
export function convertTimestamps(text: string, unit: TimestampUnit, timeZone: string): string {
  if (!isValidTimeZone(timeZone)) throw new ConversionError("invalidData");
  const lines = text.split(/\r?\n/);
  const rows = [["input", "unix_seconds", "unix_milliseconds", "iso_8601_utc", timeZone, "utc_offset"].map(csvField).join(",")];
  let count = 0;
  lines.forEach((line, i) => {
    if (line.trim() === "") return;
    if (++count > MAX_TIMESTAMP_LINES) throw new ConversionError("invalidData");
    let ms: number;
    try {
      ms = parseTimestamp(line, unit, timeZone);
    } catch {
      throw new TextPositionError("invalidData", { line: i + 1, column: line.length - line.trimStart().length + 1 });
    }
    const seconds = ms % 1000 === 0 ? String(ms / 1000) : (ms / 1000).toFixed(3);
    const { local, offset } = formatInZone(ms, timeZone);
    rows.push([line.trim(), seconds, String(ms), new Date(ms).toISOString(), local, offset].map(csvField).join(","));
  });
  if (rows.length === 1) throw new ConversionError("invalidData");
  return `${rows.join("\n")}\n`;
}
