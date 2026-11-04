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

/**
 * "Enhance photo" (phase 17): input size in megapixels, per plan. Pro is
 * hidden for now (PRO_ENABLED=false), so both plans get the same values; they
 * are kept per plan so Pro can get more later by changing one number.
 * - auto: classic filters hold the photo as float planes (~40 bytes a pixel).
 * - upscale: Real-ESRGAN costs ~2.5 MFLOP per input pixel (2.5 TFLOP at
 *   1 MP): seconds with WebGPU, a minute or more with single-threaded WASM
 *   on a laptop and several on a phone; the x4 result is 16 MP.
 */
export interface EnhanceLimits {
  autoMaxMegapixels: number;
  upscaleMaxMegapixels: number;
}

export const enhanceLimits: Record<Plan, EnhanceLimits> = {
  free: { autoMaxMegapixels: 24, upscaleMaxMegapixels: 1 },
  pro: { autoMaxMegapixels: 24, upscaleMaxMegapixels: 1 },
};
