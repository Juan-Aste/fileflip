import { requestPlan } from "@/lib/server/plan";
import { ttsDailyQuota, ttsLimits, ttsMinuteLimiter } from "@/lib/server/tts/limits";
import { ttsProvider } from "@/lib/server/tts/provider";
import { ttsStatus, ttsSynthesize, type TtsDeps } from "@/lib/server/tts/service";
import { usageStore } from "@/lib/server/tts/usage";

// Cloud voice of the reader (task 13.3, docs/tts-nube.md). Node runtime: the
// key (GOOGLE_TTS_API_KEY) is read here and never leaves the server.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function deps(): TtsDeps {
  return {
    provider: ttsProvider(),
    store: usageStore(),
    limits: ttsLimits(),
    minute: ttsMinuteLimiter,
    daily: ttsDailyQuota,
    userId: async () => (await requestPlan()).userId,
  };
}

export function GET(request: Request) {
  return ttsStatus(request, deps());
}

export function POST(request: Request) {
  return ttsSynthesize(request, deps());
}
