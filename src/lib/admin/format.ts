import { formatDate, formatNumber } from "@/lib/format";

/** "850 ms", "2.3 s", "4 min" (the panel is Spanish-only). */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${formatNumber(Math.round(ms), "es")} ms`;
  if (ms < 60_000) return `${formatNumber(ms / 1000, "es", { maximumFractionDigits: 1 })} s`;
  return `${formatNumber(Math.round(ms / 60_000), "es")} min`;
}

/** Chart label of a bucket key: "2026-10-20" → "20 oct", "2026-10" → "oct 2026" (UTC). */
export function formatBucket(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d ?? 1));
  const options: Intl.DateTimeFormatOptions = d ? { day: "numeric", month: "short" } : { month: "short", year: "numeric" };
  return formatDate(date, "es", { ...options, timeZone: "UTC" }).replace(".", "");
}
