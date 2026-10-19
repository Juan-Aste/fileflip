import "server-only";

/**
 * Sliding-window rate limiter kept in memory. Good for a single app instance
 * (our Railway setup); with several replicas each one counts separately,
 * which only makes the limit a bit looser.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records a hit; returns how many ms to wait when over the limit (0 = allowed). */
  hit(key: string): number {
    const now = this.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return this.windowMs - (now - recent[0]);
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(now);
    return 0;
  }

  private prune(now: number) {
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key);
    }
  }
}

/** Client IP behind Railway's proxy (first X-Forwarded-For entry). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

const perMinute = Number(process.env.RATE_LIMIT_PER_MINUTE) || 20;

/** Shared limiter for anonymous server conversions. */
export const conversionLimiter = new RateLimiter(perMinute, 60_000);
