import "server-only";
import { apiError } from "@/lib/api-errors";
import { readJson, TOO_LARGE } from "@/lib/server/body";
import { clientIp, type RateLimiter } from "@/lib/server/rate-limit";
import { isSameOrigin } from "@/lib/server/same-origin";
import { CLOUD_MAX_BYTES, CLOUD_MAX_CHARS, CLOUD_MAX_RATE, CLOUD_MIN_RATE, cloudVoice } from "@/lib/tts/cloud-voices";
import type { DailyQuota, TtsLimits } from "./limits";
import { TtsProviderError, type TtsProvider } from "./provider";
import { createTtsToken, verifyTtsToken } from "./token";
import type { UsageStore } from "./usage";

// POST /api/tts and GET /api/tts (task 13.3). The user's text is sent to the
// provider and never stored or logged: errors are logged by kind and HTTP
// status only, and the stats keep just the number of characters.

export interface TtsDeps {
  provider: TtsProvider | null;
  store: UsageStore;
  limits: TtsLimits;
  minute: RateLimiter;
  daily: DailyQuota;
  /** Signed-in user, if any (the daily limit is then per account). */
  userId: () => Promise<string | undefined>;
  now?: () => Date;
}

const noStore = { "Cache-Control": "no-store" };

/** Characters as the provider bills them (code points). */
export const billedChars = (text: string) => Array.from(text).length;

/**
 * Key for the per-IP limits (13.5). An IPv6 user usually gets a whole /64 and
 * can pick a new address in it at will, so IPv6 addresses count by /64;
 * IPv4 (also IPv4-mapped IPv6) by address.
 */
export function ipBucket(ip: string): string {
  const value = ip.trim().toLowerCase().replace(/^\[|\](:\d+)?$/g, "").split("%")[0];
  if (!value.includes(":")) return value;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return mapped[1];
  const [head, tail = ""] = value.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = value.includes("::") ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right] : left;
  if (groups.length !== 8 || !groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return value;
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

/** Plain text only: control characters (except line breaks and tabs) are dropped. */
export function cleanText(text: string): string {
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
}

/** Whether the cloud voice is on and has room this month; with a fresh token. */
export async function ttsStatus(request: Request, deps: TtsDeps): Promise<Response> {
  if (!deps.provider) return Response.json({ enabled: false }, { headers: noStore });
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return apiError("invalidRequest", noStore);
  const now = deps.now?.() ?? new Date();
  let available = true;
  try {
    available = (await deps.store.read(now)).month < deps.limits.monthly;
  } catch (error) {
    console.warn("TTS usage read failed", (error as Error)?.name);
    available = false;
  }
  return Response.json({ enabled: true, available, maxChars: CLOUD_MAX_CHARS, token: createTtsToken(now.getTime()) }, { headers: noStore });
}

interface ParsedRequest {
  text: string;
  voice: NonNullable<ReturnType<typeof cloudVoice>>;
  rate: number;
}

function parse(body: unknown): ParsedRequest | "tooLarge" | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  if (typeof raw.text !== "string") return null;
  const text = cleanText(raw.text);
  const voice = cloudVoice(raw.voice);
  if (!text || !voice) return null;
  if (billedChars(text) > CLOUD_MAX_CHARS || new TextEncoder().encode(text).length > CLOUD_MAX_BYTES) return "tooLarge";
  const rate = typeof raw.rate === "number" && Number.isFinite(raw.rate) ? Math.min(CLOUD_MAX_RATE, Math.max(CLOUD_MIN_RATE, raw.rate)) : 1;
  return { text, voice, rate };
}

/** One sentence (or chunk) of text → MP3. */
export async function ttsSynthesize(request: Request, deps: TtsDeps): Promise<Response> {
  // Off without a key: as if the route did not exist.
  if (!deps.provider) return new Response(null, { status: 404, headers: noStore });
  if (!isSameOrigin(request)) return apiError("invalidRequest", noStore);
  const ip = ipBucket(clientIp(request));
  const wait = deps.minute.hit(ip);
  if (wait > 0) return apiError("rateLimited", { ...noStore, "Retry-After": String(Math.ceil(wait / 1000)) });

  const body = await readJson(request, 16 * 1024);
  if (body === TOO_LARGE) return apiError("fileTooLarge", noStore);
  if (!body || typeof body !== "object") return apiError("invalidRequest", noStore);
  const now = deps.now?.() ?? new Date();
  if (!verifyTtsToken((body as { token?: unknown }).token, now.getTime())) return apiError("ttsTokenExpired", noStore);
  const parsed = parse(body);
  if (parsed === "tooLarge") return apiError("fileTooLarge", noStore);
  if (!parsed) return apiError("invalidRequest", noStore);

  const chars = billedChars(parsed.text);
  const userId = await deps.userId().catch(() => undefined);
  const key = userId ? `user:${userId}` : `ip:${ip}`;
  if (!deps.daily.take(key, chars, userId ? deps.limits.dailyUser : deps.limits.dailyAnon)) return apiError("ttsDailyLimit", noStore);

  let reserved: boolean;
  try {
    reserved = await deps.store.reserve(chars, deps.limits.monthly, now);
  } catch (error) {
    // Without the counter the cap can't be enforced: refuse (fail closed).
    console.warn("TTS usage reserve failed", (error as Error)?.name);
    deps.daily.give(key, chars);
    return apiError("serviceUnavailable", noStore);
  }
  if (!reserved) {
    deps.daily.give(key, chars);
    return apiError("ttsMonthlyLimit", noStore);
  }

  try {
    const audio = await deps.provider.synthesize(parsed, request.signal);
    return new Response(audio as Uint8Array<ArrayBuffer>, { headers: { ...noStore, "Content-Type": "audio/mpeg" } });
  } catch (error) {
    deps.daily.give(key, chars);
    await deps.store.release(chars, now).catch(() => {});
    if (request.signal.aborted) return new Response(null, { status: 499, headers: noStore });
    const reason = error instanceof TtsProviderError ? error.reason : "failed";
    const status = error instanceof TtsProviderError ? error.status : undefined;
    // Kind and status only: never the text or the provider's answer.
    console.warn(`TTS provider ${reason}${status ? ` (HTTP ${status})` : ""}`);
    return apiError(reason === "quota" ? "ttsMonthlyLimit" : "serviceUnavailable", noStore);
  }
}
