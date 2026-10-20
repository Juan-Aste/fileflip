import "server-only";
import { connectToDatabase } from "@/lib/db";
import type { Period } from "@/lib/admin/period";
import { ConversionLog } from "@/models/ConversionLog";
import { inRange } from "./buckets";

export interface ErrorCount {
  /** An API error code, or "unknown" for failures logged without one. */
  code: string;
  count: number;
}

export interface QualityStats {
  /** Failed conversions by error code, most frequent first. */
  errors: ErrorCount[];
  /** Mean duration of successful conversions with a duration, overall and per engine (ms, rounded). */
  avgDurationMs: number | null;
  avgDurationByEngine: { browser: number | null; server: number | null };
  /** Bytes in (every attempt) and out (successful ones) in the period. */
  inputBytes: number;
  outputBytes: number;
}

interface FacetResult {
  errors: Array<{ _id: string; count: number }>;
  durations: Array<{ _id: "browser" | "server"; sum: number; count: number }>;
  sizes: Array<{ input: number; output: number }>;
}

/** Errors, durations and processed bytes of the period, in one `$facet` pass. */
export async function qualityStats(period: Period): Promise<QualityStats> {
  await connectToDatabase();
  const [facets] = await ConversionLog.aggregate<FacetResult>([
    inRange(period),
    {
      $facet: {
        errors: [
          { $match: { success: false } },
          { $group: { _id: { $ifNull: ["$errorCode", "unknown"] }, count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ],
        durations: [
          { $match: { success: true, durationMs: { $type: "number" } } },
          { $group: { _id: "$engine", sum: { $sum: "$durationMs" }, count: { $sum: 1 } } },
        ],
        sizes: [
          {
            $group: {
              _id: null,
              input: { $sum: "$size" },
              output: { $sum: { $cond: ["$success", { $ifNull: ["$outputSize", 0] }, 0] } },
            },
          },
        ],
      },
    },
  ]);
  const byEngine = { browser: null as number | null, server: null as number | null };
  let sum = 0;
  let count = 0;
  for (const d of facets?.durations ?? []) {
    if (!(d._id in byEngine) || d.count === 0) continue;
    byEngine[d._id] = Math.round(d.sum / d.count);
    sum += d.sum;
    count += d.count;
  }
  return {
    errors: (facets?.errors ?? []).map(({ _id, count }) => ({ code: _id, count })),
    avgDurationMs: count > 0 ? Math.round(sum / count) : null,
    avgDurationByEngine: byEngine,
    inputBytes: facets?.sizes[0]?.input ?? 0,
    outputBytes: facets?.sizes[0]?.output ?? 0,
  };
}
