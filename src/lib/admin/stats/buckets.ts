import { bucketKeys, type Period } from "@/lib/admin/period";

/** `$dateToString` that groups `field` per day ("2026-10-20") or month ("2026-10"), in UTC. */
export function bucketExpr(bucket: Period["bucket"], field = "$createdAt") {
  return { $dateToString: { date: field, format: bucket === "month" ? "%Y-%m" : "%Y-%m-%d", timezone: "UTC" } };
}

/** `$match` stage for documents whose `field` falls in [start, end). */
export function inRange(range: { start: Date; end: Date }, field = "createdAt") {
  return { $match: { [field]: { $gte: range.start, $lt: range.end } } };
}

/**
 * Every bucket of the period in order, with the aggregated values where
 * there were some and `empty` (cloned) where there were none.
 */
export function fillBuckets<T extends object>(
  period: Pick<Period, "start" | "end" | "bucket">,
  rows: Array<T & { _id: string }>,
  empty: T,
): Array<T & { key: string }> {
  const byKey = new Map(rows.map(({ _id, ...rest }) => [_id, rest as unknown as T]));
  return bucketKeys(period).map((key) => ({ ...empty, ...byKey.get(key), key }));
}
