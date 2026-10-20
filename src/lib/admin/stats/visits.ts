import "server-only";
import type { PipelineStage } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { change, type Period } from "@/lib/admin/period";
import { PageView, type PageKind } from "@/models/PageView";
import { bucketExpr, fillBuckets, inRange } from "./buckets";

export interface Count {
  key: string;
  count: number;
}

export interface VisitStats {
  total: number;
  previousTotal: number;
  change: number | null;
  perBucket: Array<{ key: string; count: number }>;
  byLocale: Count[];
  /** ISO country, or "unknown" when the CDN sent none. Top 20. */
  byCountry: Count[];
  byKind: Array<{ key: PageKind; count: number }>;
  /** Most visited long-tail pages (their language-independent id). Top 10. */
  topLongtail: Count[];
}

export const COUNTRY_LIMIT = 20;
export const LONGTAIL_LIMIT = 10;

type Group = Array<{ _id: string; count: number }>;

interface FacetResult {
  perBucket: Group;
  byLocale: Group;
  byCountry: Group;
  byKind: Group;
  topLongtail: Group;
}

const countBy = (field: unknown, limit?: number): PipelineStage.FacetPipelineStage[] => [
  { $group: { _id: field, count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } },
  ...(limit ? [{ $limit: limit }] : []),
];

const toCounts = (rows: Group = []) => rows.map(({ _id, count }) => ({ key: _id, count }));

/** Page views of the period by day, language, country, page type and long-tail page. */
export async function visitStats(period: Period): Promise<VisitStats> {
  await connectToDatabase();
  const [[facets], previousTotal] = await Promise.all([
    PageView.aggregate<FacetResult>([
      inRange(period),
      {
        $facet: {
          perBucket: [{ $group: { _id: bucketExpr(period.bucket), count: { $sum: 1 } } }],
          byLocale: countBy("$locale"),
          byCountry: countBy({ $ifNull: ["$country", "unknown"] }, COUNTRY_LIMIT),
          byKind: countBy("$kind"),
          topLongtail: [{ $match: { kind: "longtail", page: { $type: "string" } } }, ...countBy("$page", LONGTAIL_LIMIT)],
        },
      },
    ]),
    PageView.countDocuments({ createdAt: { $gte: period.previous.start, $lt: period.previous.end } }),
  ]);
  const perBucket = fillBuckets(period, facets?.perBucket ?? [], { count: 0 });
  const total = perBucket.reduce((sum, b) => sum + b.count, 0);
  return {
    total,
    previousTotal,
    change: change(total, previousTotal),
    perBucket,
    byLocale: toCounts(facets?.byLocale),
    byCountry: toCounts(facets?.byCountry),
    byKind: toCounts(facets?.byKind) as VisitStats["byKind"],
    topLongtail: toCounts(facets?.topLongtail),
  };
}
