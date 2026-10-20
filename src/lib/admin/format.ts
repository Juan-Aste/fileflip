import { formatNumber } from "@/lib/format";

/** "850 ms", "2.3 s", "4 min" (the panel is Spanish-only). */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${formatNumber(Math.round(ms), "es")} ms`;
  if (ms < 60_000) return `${formatNumber(ms / 1000, "es", { maximumFractionDigits: 1 })} s`;
  return `${formatNumber(Math.round(ms / 60_000), "es")} min`;
}
