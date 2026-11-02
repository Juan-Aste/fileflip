import "server-only";
import { ttsLimits } from "@/lib/server/tts/limits";
import { ttsProvider } from "@/lib/server/tts/provider";
import { usageStore } from "@/lib/server/tts/usage";

export interface TtsUsageSummary {
  /** GOOGLE_TTS_API_KEY is set. */
  enabled: boolean;
  month: number;
  day: number;
  monthlyLimit: number;
  /** Counted in MongoDB (else in this instance's memory only). */
  shared: boolean;
}

/** Cloud voice characters of the current month and day (UTC), for the admin panel. Null if unreadable. */
export async function ttsUsageSummary(now = new Date()): Promise<TtsUsageSummary | null> {
  try {
    const { month, day } = await usageStore().read(now);
    return { enabled: ttsProvider() !== null, month, day, monthlyLimit: ttsLimits().monthly, shared: Boolean(process.env.MONGODB_URI) };
  } catch (error) {
    console.warn("TTS usage read failed", (error as Error)?.name);
    return null;
  }
}
