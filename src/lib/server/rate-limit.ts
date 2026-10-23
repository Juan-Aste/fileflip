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

/**
 * Client IP behind Railway's proxy: the last X-Forwarded-For entry, the one
 * the proxy adds. Earlier entries come from the client and can be anything
 * (B-24: a different made-up first entry per request escaped every limit).
 * With another proxy in front (Cloudflare), the last entry is that proxy's.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

const perMinute = Number(process.env.RATE_LIMIT_PER_MINUTE) || 20;

/** Shared limiter for anonymous server conversions. */
export const conversionLimiter = new RateLimiter(perMinute, 60_000);

/** Server conversions per account: five times the anonymous limit, per user instead of per IP. */
export const accountConversionLimiter = new RateLimiter(perMinute * 5, 60_000);

/**
 * Sign-in links: every request sends an email (Resend quota, flooding
 * someone's inbox). Per IP, and per address whatever the IP (B-25).
 */
export const signInLinkLimiter = { perIp: new RateLimiter(5, 10 * 60_000), perEmail: new RateLimiter(5, 60 * 60_000) };
