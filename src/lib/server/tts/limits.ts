import "server-only";
import { RateLimiter } from "@/lib/server/rate-limit";

// Cost protection of the cloud voice (task 13.3b), all configurable by
// environment variables (docs/tts-nube.md).

const positive = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

export interface TtsLimits {
  /** Characters per day per IP without an account. */
  dailyAnon: number;
  /** Characters per day per signed-in user. */
  dailyUser: number;
  /** Global characters per month (all users): the cost cap. */
  monthly: number;
  /** Requests per minute per IP (one request is one sentence). */
  perMinute: number;
}

export function ttsLimits(env: NodeJS.ProcessEnv = process.env): TtsLimits {
  return {
    dailyAnon: positive(env.TTS_DAILY_CHARS_ANON, 20_000),
    dailyUser: positive(env.TTS_DAILY_CHARS_USER, 100_000),
    monthly: positive(env.TTS_MONTHLY_CHAR_LIMIT, 3_500_000),
    perMinute: positive(env.TTS_REQUESTS_PER_MINUTE, 60),
  };
}

/**
 * Characters per key (IP or user) per UTC day, in memory. Like RateLimiter it
 * is per app instance; the global monthly cap is in MongoDB. The IP is only a
 * key here: it is never stored anywhere else.
 */
export class DailyQuota {
  private used = new Map<string, { day: string; chars: number }>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  private today() {
    return this.now().toISOString().slice(0, 10);
  }

  /** Takes `chars` from the key's day if it fits in `limit`. */
  take(key: string, chars: number, limit: number): boolean {
    const day = this.today();
    const entry = this.used.get(key);
    const current = entry?.day === day ? entry.chars : 0;
    if (current + chars > limit) return false;
    this.used.set(key, { day, chars: current + chars });
    if (this.used.size > 50_000) this.prune(day);
    return true;
  }

  give(key: string, chars: number) {
    const entry = this.used.get(key);
    if (entry && entry.day === this.today()) entry.chars = Math.max(0, entry.chars - chars);
  }

  private prune(day: string) {
    for (const [key, entry] of this.used) if (entry.day !== day) this.used.delete(key);
  }
}

const limits = ttsLimits();
export const ttsMinuteLimiter = new RateLimiter(limits.perMinute, 60_000);
export const ttsDailyQuota = new DailyQuota();
