import "server-only";
import type { CloudVoice } from "@/lib/tts/cloud-voices";

// Cloud text-to-speech providers (task 13.3). Only Google for now; Azure can
// be added later behind the same interface. The text is sent to the provider
// and the audio returned to the browser: neither is stored or logged here.

export interface SynthesisRequest {
  text: string;
  voice: CloudVoice;
  /** 1 = normal speed. */
  rate: number;
}

export interface TtsProvider {
  readonly id: string;
  /** MP3 audio (24 kHz mono) of `text`. Throws TtsProviderError. */
  synthesize(request: SynthesisRequest, signal?: AbortSignal): Promise<Uint8Array>;
}

export class TtsProviderError extends Error {
  /** quota: the provider refused for billing/quota; failed: anything else. */
  constructor(readonly reason: "quota" | "failed", readonly status?: number) {
    super(`TTS provider ${reason}${status ? ` (HTTP ${status})` : ""}`);
  }
}

/** Sample rate of every chunk, so the browser can join them into one MP3. */
export const CLOUD_SAMPLE_RATE = 24_000;

const GOOGLE_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
const TIMEOUT_MS = 20_000;

/**
 * Google Cloud Text-to-Speech REST API (`text:synthesize`). The key goes in a
 * header, not in the URL, so it can't end up in a proxy's access log. Only
 * plain `text` is sent: never SSML, so the user can't inject markup.
 */
export class GoogleTtsProvider implements TtsProvider {
  readonly id = "google";

  constructor(
    private readonly apiKey: string,
    // Tests point this at a fake server (GOOGLE_TTS_ENDPOINT).
    private readonly endpoint: string = GOOGLE_ENDPOINT,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async synthesize({ text, voice, rate }: SynthesisRequest, signal?: AbortSignal): Promise<Uint8Array> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    let response: Response;
    try {
      response = await this.fetcher(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8", "X-Goog-Api-Key": this.apiKey },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: voice.languageCode, name: voice.id },
          audioConfig: { audioEncoding: "MP3", speakingRate: rate, sampleRateHertz: CLOUD_SAMPLE_RATE },
        }),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        cache: "no-store",
      });
    } catch {
      throw new TtsProviderError("failed");
    }
    if (!response.ok) {
      // The error body may echo the request: it is never read or logged.
      await response.body?.cancel().catch(() => {});
      throw new TtsProviderError(response.status === 429 || response.status === 403 ? "quota" : "failed", response.status);
    }
    let audioContent: unknown;
    try {
      audioContent = ((await response.json()) as { audioContent?: unknown }).audioContent;
    } catch {
      throw new TtsProviderError("failed", response.status);
    }
    if (typeof audioContent !== "string" || !audioContent) throw new TtsProviderError("failed", response.status);
    return new Uint8Array(Buffer.from(audioContent, "base64"));
  }
}

/** The configured provider, or null when the cloud voice is off (no key). */
export function ttsProvider(env: NodeJS.ProcessEnv = process.env): TtsProvider | null {
  const key = env.GOOGLE_TTS_API_KEY?.trim();
  if (!key) return null;
  return new GoogleTtsProvider(key, env.GOOGLE_TTS_ENDPOINT?.trim() || GOOGLE_ENDPOINT);
}
