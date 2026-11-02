import "server-only";
import { connectToDatabase } from "@/lib/db";
import { TtsUsage } from "@/models/TtsUsage";

// Global count of characters sent to the cloud voice (task 13.3b). The month
// counter is the cost cap: once it reaches TTS_MONTHLY_CHAR_LIMIT the cloud
// voice turns itself off until the next month (UTC). Characters are reserved
// before calling the provider (atomically, so parallel requests can't jump
// past the cap together) and given back if the call fails.

export const monthKey = (now: Date) => `m:${now.toISOString().slice(0, 7)}`;
export const dayKey = (now: Date) => `d:${now.toISOString().slice(0, 10)}`;

export interface UsageStore {
  /** Adds `chars` to the month (and day) unless the month would pass `limit`. */
  reserve(chars: number, limit: number, now: Date): Promise<boolean>;
  /** Gives back characters of a request that failed. */
  release(chars: number, now: Date): Promise<void>;
  /** Characters used this month and today. */
  read(now: Date): Promise<{ month: number; day: number }>;
}

/** Counter kept in memory: without MongoDB (local runs, tests). Restarts reset it. */
export class MemoryUsageStore implements UsageStore {
  private counts = new Map<string, number>();

  async reserve(chars: number, limit: number, now: Date) {
    const month = this.counts.get(monthKey(now)) ?? 0;
    if (chars > limit || month + chars > limit) return false;
    this.counts.set(monthKey(now), month + chars);
    this.counts.set(dayKey(now), (this.counts.get(dayKey(now)) ?? 0) + chars);
    return true;
  }

  async release(chars: number, now: Date) {
    for (const key of [monthKey(now), dayKey(now)]) this.counts.set(key, Math.max(0, (this.counts.get(key) ?? 0) - chars));
  }

  async read(now: Date) {
    return { month: this.counts.get(monthKey(now)) ?? 0, day: this.counts.get(dayKey(now)) ?? 0 };
  }
}

const isDuplicateKey = (error: unknown) => (error as { code?: number } | null)?.code === 11000;

/** Counter in MongoDB, shared by every app instance. */
export class MongoUsageStore implements UsageStore {
  async reserve(chars: number, limit: number, now: Date) {
    if (chars > limit) return false;
    await connectToDatabase();
    try {
      // Matches only while there is room; when the month document exists but
      // is full, the upsert tries to insert a second one and fails (11000).
      await TtsUsage.updateOne({ _id: monthKey(now), chars: { $lte: limit - chars } }, { $inc: { chars } }, { upsert: true });
    } catch (error) {
      if (isDuplicateKey(error)) return false;
      throw error;
    }
    await TtsUsage.updateOne({ _id: dayKey(now) }, { $inc: { chars } }, { upsert: true }).catch(() => {});
    return true;
  }

  async release(chars: number, now: Date) {
    await connectToDatabase();
    await TtsUsage.updateMany({ _id: { $in: [monthKey(now), dayKey(now)] } }, { $inc: { chars: -chars } });
  }

  async read(now: Date) {
    await connectToDatabase();
    const docs = await TtsUsage.find({ _id: { $in: [monthKey(now), dayKey(now)] } }).lean();
    const get = (key: string) => Math.max(0, docs.find((d) => d._id === key)?.chars ?? 0);
    return { month: get(monthKey(now)), day: get(dayKey(now)) };
  }
}

const globalStore = globalThis as typeof globalThis & { _ttsUsage?: UsageStore };

export function usageStore(): UsageStore {
  return (globalStore._ttsUsage ??= process.env.MONGODB_URI ? new MongoUsageStore() : new MemoryUsageStore());
}
