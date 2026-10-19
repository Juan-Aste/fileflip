// Usage limits per plan. Browser conversions cost us nothing, so they are far
// more generous than server ones. Basic features are never paywalled: Pro only
// raises sizes and batch counts.

export type Plan = "free" | "pro";

export interface PlanLimits {
  /** Max size of a single file processed on our server. */
  serverMaxFileBytes: number;
  /** Max files per batch for server conversions. */
  serverMaxBatch: number;
  /** Max size of a single file processed in the browser. */
  browserMaxFileBytes: number;
  /** Max files per batch in the browser. */
  browserMaxBatch: number;
}

const MB = 1024 * 1024;

export const limits: Record<Plan, PlanLimits> = {
  free: {
    serverMaxFileBytes: 15 * MB,
    serverMaxBatch: 5,
    browserMaxFileBytes: 200 * MB,
    browserMaxBatch: 50,
  },
  pro: {
    serverMaxFileBytes: 100 * MB,
    serverMaxBatch: 50,
    browserMaxFileBytes: 1024 * MB,
    browserMaxBatch: 500,
  },
};

export type LimitViolation = "fileTooLarge" | "tooManyFiles";

/** Checks a batch against the plan; returns the first violation or null. */
export function checkLimits(
  sizes: readonly number[],
  engine: "browser" | "server",
  plan: Plan,
): LimitViolation | null {
  const l = limits[plan];
  const maxFile = engine === "server" ? l.serverMaxFileBytes : l.browserMaxFileBytes;
  const maxBatch = engine === "server" ? l.serverMaxBatch : l.browserMaxBatch;
  if (sizes.length > maxBatch) return "tooManyFiles";
  if (sizes.some((s) => s > maxFile)) return "fileTooLarge";
  return null;
}
