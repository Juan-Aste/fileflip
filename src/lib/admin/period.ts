/**
 * Period selector of the admin panel. All dates are UTC: days and months
 * start at 00:00 UTC, and MongoDB groups with the same convention.
 */
export const periodPresets = ["today", "7d", "30d", "12m", "custom"] as const;
export type PeriodPreset = (typeof periodPresets)[number];

export interface Range {
  start: Date;
  /** Exclusive. */
  end: Date;
}

export interface Period extends Range {
  preset: PeriodPreset;
  /** The same length right before, for comparisons. */
  previous: Range;
  /** Chart granularity. */
  bucket: "day" | "month";
}

const DAY = 24 * 60 * 60 * 1000;
/** Longest custom range, to keep queries bounded (the logs live one year anyway). */
const MAX_CUSTOM_DAYS = 3 * 366;
/** Custom ranges up to this long are charted per day, longer ones per month. */
const MAX_DAILY_DAYS = 92;

const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const addMonths = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

/** "2026-10-20" → Date at 00:00 UTC, or null if it is not a real date. */
export function parseDay(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
export const monthKey = (d: Date) => d.toISOString().slice(0, 7);

function withPrevious(preset: PeriodPreset, start: Date, end: Date, bucket: Period["bucket"]): Period {
  const previous =
    preset === "12m"
      ? { start: addMonths(start, -12), end: start }
      : { start: new Date(start.getTime() - (end.getTime() - start.getTime())), end: start };
  return { preset, start, end, previous, bucket };
}

/**
 * Resolves the selector's query (`period`, and `from`/`to` as YYYY-MM-DD,
 * both inclusive, for "custom"). Anything invalid falls back to 30 days.
 */
export function resolvePeriod(
  query: { period?: unknown; from?: unknown; to?: unknown },
  now: Date = new Date(),
): Period {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  switch (query.period) {
    case "today":
      return withPrevious("today", today, tomorrow, "day");
    case "7d":
      return withPrevious("7d", addDays(today, -6), tomorrow, "day");
    case "12m": {
      const thisMonth = addMonths(today, 0);
      return withPrevious("12m", addMonths(thisMonth, -11), addMonths(thisMonth, 1), "month");
    }
    case "custom": {
      const from = parseDay(query.from);
      const to = parseDay(query.to);
      if (from && to && from <= to) {
        const end = addDays(to, 1);
        const start = end.getTime() - from.getTime() > MAX_CUSTOM_DAYS * DAY ? addDays(end, -MAX_CUSTOM_DAYS) : from;
        const days = (end.getTime() - start.getTime()) / DAY;
        return withPrevious("custom", start, end, days > MAX_DAILY_DAYS ? "month" : "day");
      }
      break;
    }
  }
  return withPrevious("30d", addDays(today, -29), tomorrow, "day");
}

/** Every bucket key of the period ("2026-10-20" or "2026-10"), to chart days without data as 0. */
export function bucketKeys(period: Pick<Period, "start" | "end" | "bucket">): string[] {
  const keys: string[] = [];
  if (period.bucket === "month") {
    for (let d = addMonths(period.start, 0); d < period.end; d = addMonths(d, 1)) keys.push(monthKey(d));
  } else {
    for (let d = period.start; d < period.end; d = addDays(d, 1)) keys.push(dayKey(d));
  }
  return keys;
}

/** Relative change vs the previous period (0.25 = +25 %), or null when there is nothing to compare with. */
export function change(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}
