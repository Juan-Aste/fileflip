import { afterEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "@/lib/server/rate-limit";
import { DailyQuota, ttsLimits, type TtsLimits } from "./limits";
import { GoogleTtsProvider, TtsProviderError, ttsProvider, type SynthesisRequest, type TtsProvider } from "./provider";
import { billedChars, cleanText, ttsStatus, ttsSynthesize, type TtsDeps } from "./service";
import { createTtsToken, verifyTtsToken } from "./token";
import { MemoryUsageStore } from "./usage";

const SITE = "https://fileflect.com";

class FakeProvider implements TtsProvider {
  readonly id = "fake";
  calls: SynthesisRequest[] = [];
  fail: Error | null = null;
  async synthesize(request: SynthesisRequest) {
    this.calls.push(request);
    if (this.fail) throw this.fail;
    return new Uint8Array([0xff, 0xf3, 1, 2]);
  }
}

// Clock of the current test (tokens are signed and checked with it).
let clock = () => new Date();

function setup(overrides: Partial<Omit<TtsDeps, "limits">> & { limits?: Partial<TtsLimits> } = {}) {
  let now = new Date("2026-11-15T12:00:00Z");
  clock = () => now;
  const provider = new FakeProvider();
  const deps: TtsDeps = {
    provider,
    store: new MemoryUsageStore(),
    minute: new RateLimiter(1000, 60_000),
    daily: new DailyQuota(() => now),
    userId: async () => undefined,
    now: () => now,
    ...overrides,
    limits: { dailyAnon: 100, dailyUser: 500, monthly: 1000, perMinute: 1000, ...overrides.limits },
  };
  return { deps, provider, setNow: (d: string) => (now = new Date(d)), now: () => now };
}

function post(body: unknown, { origin = SITE, ip = "1.2.3.4", site = "same-origin" }: { origin?: string | null; ip?: string; site?: string | null } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", host: "fileflect.com", "x-forwarded-for": ip };
  if (origin) headers.origin = origin;
  if (site) headers["sec-fetch-site"] = site;
  return new Request(`${SITE}/api/tts`, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
}

const token = () => createTtsToken(clock().getTime());
const say = (text: string, extra: Record<string, unknown> = {}) => ({ text, voice: "es-US-Wavenet-A", rate: 1, token: token(), ...extra });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("cloud voice off (no key)", () => {
  it("reports disabled and the route answers 404", async () => {
    const { deps } = setup({ provider: null });
    expect(await (await ttsStatus(new Request(`${SITE}/api/tts`), deps)).json()).toEqual({ enabled: false });
    expect((await ttsSynthesize(post(say("Hola")), deps)).status).toBe(404);
  });

  it("ttsProvider needs GOOGLE_TTS_API_KEY", () => {
    expect(ttsProvider({} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(ttsProvider({ GOOGLE_TTS_API_KEY: "  " } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(ttsProvider({ GOOGLE_TTS_API_KEY: "k" } as unknown as NodeJS.ProcessEnv)).toBeInstanceOf(GoogleTtsProvider);
  });
});

describe("GET /api/tts", () => {
  it("gives a valid token and no secret", async () => {
    const { deps } = setup();
    vi.stubEnv("GOOGLE_TTS_API_KEY", "secret-key-123");
    const response = await ttsStatus(new Request(`${SITE}/api/tts`, { headers: { "sec-fetch-site": "same-origin" } }), deps);
    const text = await response.clone().text();
    expect(text).not.toContain("secret-key-123");
    const body = await response.json();
    expect(body).toMatchObject({ enabled: true, available: true, maxChars: 1500 });
    expect(verifyTtsToken(body.token, clock().getTime())).toBe(true);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses cross-site requests", async () => {
    const { deps } = setup();
    expect((await ttsStatus(new Request(`${SITE}/api/tts`, { headers: { "sec-fetch-site": "cross-site" } }), deps)).status).toBe(400);
  });
});

describe("POST /api/tts", () => {
  it("returns MP3 audio for plain text with the chosen voice and speed", async () => {
    const { deps, provider } = setup();
    const response = await ttsSynthesize(post(say("Hola mundo.", { rate: 1.5 })), deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xf3, 1, 2]));
    expect(provider.calls).toEqual([{ text: "Hola mundo.", voice: { id: "es-US-Wavenet-A", languageCode: "es-US", gender: "female" }, rate: 1.5 }]);
  });

  it("checks the origin (other sites can't spend the quota)", async () => {
    const { deps, provider } = setup();
    expect((await ttsSynthesize(post(say("a"), { origin: "https://evil.example" }), deps)).status).toBe(400);
    expect((await ttsSynthesize(post(say("a"), { origin: null }), deps)).status).toBe(400);
    expect((await ttsSynthesize(post(say("a"), { site: "cross-site" }), deps)).status).toBe(400);
    expect(provider.calls).toHaveLength(0);
  });

  it("needs a valid, unexpired token", async () => {
    const { deps } = setup();
    expect(await (await ttsSynthesize(post(say("a", { token: undefined })), deps)).json()).toEqual({ error: "ttsTokenExpired" });
    expect((await ttsSynthesize(post(say("a", { token: token() + "x" })), deps)).status).toBe(403);
    const old = createTtsToken(clock().getTime() - 31 * 60_000);
    expect((await ttsSynthesize(post(say("a", { token: old })), deps)).status).toBe(403);
  });

  it("rejects unknown voices, empty text, junk and oversized requests", async () => {
    const { deps, provider } = setup({ limits: { dailyAnon: 1e6, monthly: 1e7 } });
    expect((await ttsSynthesize(post(say("Hola", { voice: "es-US-Studio-B" })), deps)).status).toBe(400);
    expect((await ttsSynthesize(post(say("  \u0001 ")), deps)).status).toBe(400);
    expect((await ttsSynthesize(post("not json"), deps)).status).toBe(400);
    expect((await ttsSynthesize(post(say("a".repeat(1501))), deps)).status).toBe(413);
    // 1500 characters but over 5000 bytes (4-byte emoji).
    expect((await ttsSynthesize(post(say("😀".repeat(1300))), deps)).status).toBe(413);
    expect((await ttsSynthesize(post("x".repeat(17 * 1024)), deps)).status).toBe(413);
    expect(provider.calls).toHaveLength(0);
  });

  it("sends SSML-looking input as plain text, never as SSML", async () => {
    const { deps, provider } = setup();
    vi.stubEnv("GOOGLE_TTS_API_KEY", "k");
    const fetcher = vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () => Response.json({ audioContent: Buffer.from([1, 2]).toString("base64") }));
    const google = new GoogleTtsProvider("the-key", "https://fake.test/v1/text:synthesize", fetcher as unknown as typeof fetch);
    await ttsSynthesize(post(say('<speak><audio src="https://x"/></speak>')), { ...deps, provider: google });
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).not.toContain("the-key");
    expect((init!.headers as Record<string, string>)["X-Goog-Api-Key"]).toBe("the-key");
    const sent = JSON.parse(String(init!.body));
    expect(sent.input).toEqual({ text: '<speak><audio src="https://x"/></speak>' });
    expect(sent.input.ssml).toBeUndefined();
    expect(sent.audioConfig).toMatchObject({ audioEncoding: "MP3", sampleRateHertz: 24000 });
    expect(provider.calls).toHaveLength(0);
  });

  it("limits requests per minute per IP", async () => {
    const { deps } = setup({ minute: new RateLimiter(2, 60_000) });
    expect((await ttsSynthesize(post(say("a")), deps)).status).toBe(200);
    expect((await ttsSynthesize(post(say("a")), deps)).status).toBe(200);
    const third = await ttsSynthesize(post(say("a")), deps);
    expect(third.status).toBe(429);
    expect(third.headers.get("retry-after")).toBeTruthy();
    expect((await ttsSynthesize(post(say("a"), { ip: "5.6.7.8" }), deps)).status).toBe(200);
  });

  it("limits characters per day per IP without an account, more with one, and resets the next day", async () => {
    const { deps, setNow } = setup();
    expect((await ttsSynthesize(post(say("x".repeat(60))), deps)).status).toBe(200);
    const over = await ttsSynthesize(post(say("x".repeat(60))), deps);
    expect(await over.json()).toEqual({ error: "ttsDailyLimit" });
    expect(over.status).toBe(429);
    // Another IP has its own day.
    expect((await ttsSynthesize(post(say("x".repeat(60)), { ip: "9.9.9.9" }), deps)).status).toBe(200);
    // Signed in: per account, with the higher limit.
    const user = { ...deps, userId: async () => "u1" };
    for (let i = 0; i < 8; i++) expect((await ttsSynthesize(post(say("x".repeat(60))), user)).status).toBe(200);
    expect((await ttsSynthesize(post(say("x".repeat(60))), user)).status).toBe(429);
    setNow("2026-11-16T00:00:01Z");
    expect((await ttsSynthesize(post(say("x".repeat(60))), deps)).status).toBe(200);
  });

  it("turns itself off at the monthly cap and comes back the next month", async () => {
    const { deps, setNow } = setup({ limits: { dailyAnon: 1e6, monthly: 100 } });
    expect((await ttsSynthesize(post(say("x".repeat(90))), deps)).status).toBe(200);
    const capped = await ttsSynthesize(post(say("x".repeat(20))), deps);
    expect(capped.status).toBe(503);
    expect(await capped.json()).toEqual({ error: "ttsMonthlyLimit" });
    expect((await ttsSynthesize(post(say("x".repeat(10))), deps)).status).toBe(200);
    expect((await (await ttsStatus(new Request(`${SITE}/api/tts`), deps)).json()).available).toBe(false);
    setNow("2026-12-01T00:00:00Z");
    expect((await (await ttsStatus(new Request(`${SITE}/api/tts`), deps)).json()).available).toBe(true);
    expect((await ttsSynthesize(post(say("x".repeat(90))), deps)).status).toBe(200);
  });

  it("gives the characters back when the provider fails, and never logs the text", async () => {
    const { deps, provider, now } = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    provider.fail = new TtsProviderError("failed", 500);
    const response = await ttsSynthesize(post(say("Texto secreto del usuario")), deps);
    expect(response.status).toBe(503);
    expect(await deps.store.read(now())).toEqual({ month: 0, day: 0 });
    provider.fail = new TtsProviderError("quota", 429);
    expect(await (await ttsSynthesize(post(say("Texto secreto del usuario")), deps)).json()).toEqual({ error: "ttsMonthlyLimit" });
    const logged = JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
    expect(logged).not.toContain("secreto");
    expect(logged).toContain("HTTP 500");
    // Still within today's 100 characters: nothing was charged.
    provider.fail = null;
    expect((await ttsSynthesize(post(say("x".repeat(100))), deps)).status).toBe(200);
  });

  it("refuses (fails closed) when the monthly counter can't be read", async () => {
    const { deps, provider } = setup();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    deps.store.reserve = async () => {
      throw new Error("db down");
    };
    expect((await ttsSynthesize(post(say("Hola")), deps)).status).toBe(503);
    expect(provider.calls).toHaveLength(0);
  });
});

describe("helpers", () => {
  it("counts characters like the provider bills them", () => {
    expect(billedChars("año 😀")).toBe(5);
    expect(cleanText(" a\u0000b\nc\t ")).toBe("ab\nc");
  });

  it("reads the limits from the environment, with defaults", () => {
    expect(ttsLimits({} as unknown as NodeJS.ProcessEnv)).toEqual({ dailyAnon: 20000, dailyUser: 100000, monthly: 3500000, perMinute: 60 });
    expect(ttsLimits({ TTS_MONTHLY_CHAR_LIMIT: "1000", TTS_DAILY_CHARS_ANON: "-1" } as unknown as NodeJS.ProcessEnv)).toMatchObject({ monthly: 1000, dailyAnon: 20000 });
  });

  it("Google provider maps errors without reading the body", async () => {
    const fetcher = vi.fn(async () => new Response("echo of the text", { status: 403 }));
    const google = new GoogleTtsProvider("k", "https://fake.test", fetcher as unknown as typeof fetch);
    const voice = { id: "en-US-Wavenet-F", languageCode: "en-US", gender: "female" as const };
    await expect(google.synthesize({ text: "t", voice, rate: 1 })).rejects.toMatchObject({ reason: "quota", status: 403 });
    fetcher.mockImplementationOnce(async () => Response.json({}));
    await expect(google.synthesize({ text: "t", voice, rate: 1 })).rejects.toMatchObject({ reason: "failed" });
  });
});
