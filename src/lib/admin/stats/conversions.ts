import "server-only";
import { connectToDatabase } from "@/lib/db";
import { change, type Period } from "@/lib/admin/period";
import { ConversionLog, type ConversionTool } from "@/models/ConversionLog";
import { bucketExpr, fillBuckets, inRange } from "./buckets";

export interface ConversionBucket {
  key: string;
  total: number;
  failed: number;
}

export interface TopConversion {
  /** "convert" (format converter) or a PDF tool id. */
  tool: ConversionTool;
  /** Only for "convert": the format pair. */
  from?: string;
  to?: string;
  count: number;
}

export interface ConversionStats {
  /** Every attempt (successful or not) in the period. */
  total: number;
  succeeded: number;
  failed: number;
  previousTotal: number;
  /** Relative change of `total` vs the previous period, or null. */
  change: number | null;
  perBucket: ConversionBucket[];
  /** Top 10 tools / format pairs by attempts. */
  top: TopConversion[];
  engines: { browser: number; server: number };
}

export const TOP_LIMIT = 10;

/** Entries logged before the `tool` field existed are format conversions. */
const toolExpr = { $ifNull: ["$tool", "convert"] };

interface FacetResult {
  totals: Array<{ total: number; failed: number }>;
  perBucket: Array<{ _id: string; total: number; failed: number }>;
  top: Array<{ _id: { tool: ConversionTool; from?: string; to?: string }; count: number }>;
  engines: Array<{ _id: "browser" | "server"; count: number }>;
}

const failedSum = { $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] } };

/**
 * Conversion stats for the admin panel: one `$facet` pass over the period
 * (the `$match` on `createdAt` uses its index) plus a count of the previous one.
 */
export async function conversionStats(period: Period): Promise<ConversionStats> {
  await connectToDatabase();
  const [[facets], previousTotal] = await Promise.all([
    ConversionLog.aggregate<FacetResult>([
      inRange(period),
      {
        $facet: {
          totals: [{ $group: { _id: null, total: { $sum: 1 }, failed: failedSum } }],
          perBucket: [{ $group: { _id: bucketExpr(period.bucket), total: { $sum: 1 }, failed: failedSum } }],
          top: [
            {
              $group: {
                _id: {
                  $cond: [
                    { $eq: [toolExpr, "convert"] },
                    { tool: "convert", from: "$from", to: "$to" },
                    { tool: toolExpr },
                  ],
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1, _id: 1 } },
            { $limit: TOP_LIMIT },
          ],
          engines: [{ $group: { _id: "$engine", count: { $sum: 1 } } }],
        },
      },
    ]),
    ConversionLog.countDocuments({ createdAt: { $gte: period.previous.start, $lt: period.previous.end } }),
  ]);
  const total = facets?.totals[0]?.total ?? 0;
  const failed = facets?.totals[0]?.failed ?? 0;
  const engines = { browser: 0, server: 0 };
  for (const e of facets?.engines ?? []) if (e._id in engines) engines[e._id] = e.count;
  return {
    total,
    succeeded: total - failed,
    failed,
    previousTotal,
    change: change(total, previousTotal),
    perBucket: fillBuckets(period, facets?.perBucket ?? [], { total: 0, failed: 0 }),
    top: (facets?.top ?? []).map(({ _id, count }) => ({ ..._id, count })),
    engines,
  };
}
