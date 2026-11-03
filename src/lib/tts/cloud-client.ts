// Browser side of the cloud voice (task 13.3c): asks /api/tts whether it is
// on (and for a short-lived token), sends one sentence at a time and decodes
// the MP3 that comes back into PCM for the gapless player. Nothing is kept:
// the text goes to our server, which passes it to Google and returns the audio.
import { isApiErrorCode } from "@/lib/api-errors";
import { ConversionError } from "@/lib/convert-error";
import { CLOUD_MAX_CHARS } from "./cloud-voices";
import type { GeneratedAudio } from "./player";

export interface CloudStatus {
  enabled: boolean;
  /** Under the site's monthly cap. */
  available?: boolean;
  maxChars?: number;
  token?: string;
}

/** Tokens last 30 minutes on the server; a new one is asked for after 20. */
const STATUS_MAX_AGE_MS = 20 * 60_000;
let cached: { value: Promise<CloudStatus>; at: number } | null = null;

/** Whether the cloud voice is configured and available (cached; `refresh` asks again). */
export function cloudStatus(refresh = false): Promise<CloudStatus> {
  if (!refresh && cached && Date.now() - cached.at < STATUS_MAX_AGE_MS) return cached.value;
  const value = fetch("/api/tts", { cache: "no-store", credentials: "same-origin" })
    .then(async (r) => (r.ok ? ((await r.json()) as CloudStatus) : { enabled: false }))
    .catch(() => ({ enabled: false }));
  cached = { value, at: Date.now() };
  return value;
}

/** Remembers that the monthly cap was reached, until the status is asked again. */
function markUnavailable() {
  if (!cached) return;
  const previous = cached.value;
  cached = { value: previous.then((s) => ({ ...s, available: false })), at: cached.at };
}

/** For tests. */
export function resetCloudStatus() {
  cached = null;
}

/** Pieces of at most `max` characters, cut at spaces when possible (a sentence is rarely that long). */
export function chunkText(text: string, max = CLOUD_MAX_CHARS): string[] {
  const chars = Array.from(text.trim());
  const chunks: string[] = [];
  while (chars.length > max) {
    let cut = max;
    for (let i = max; i > max / 2; i--) {
      if (/\s/.test(chars[i]!)) {
        cut = i;
        break;
      }
    }
    chunks.push(chars.splice(0, cut).join("").trim());
  }
  const rest = chars.join("").trim();
  if (rest) chunks.push(rest);
  return chunks.filter(Boolean);
}

/** MP3 of one chunk (≤ CLOUD_MAX_CHARS), as returned by the server. */
export async function fetchCloudChunk(text: string, voice: string, rate: number, signal?: AbortSignal, retried = false): Promise<ArrayBuffer> {
  const status = await cloudStatus();
  if (!status.enabled || !status.token) throw new ConversionError("serviceUnavailable");
  let response: Response;
  try {
    response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ text, voice, rate, token: status.token }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ConversionError("connectionLost");
  }
  if (response.ok) return response.arrayBuffer();
  const code = ((await response.json().catch(() => ({}))) as { error?: unknown }).error;
  if (code === "ttsTokenExpired" && !retried) {
    await cloudStatus(true);
    return fetchCloudChunk(text, voice, rate, signal, true);
  }
  if (code === "ttsMonthlyLimit") markUnavailable();
  throw new ConversionError(isApiErrorCode(code) ? code : "serviceUnavailable");
}

/** Decodes MP3 bytes to mono PCM at the file's rate. */
export async function decodeMp3(bytes: ArrayBuffer, sampleRate = 24_000): Promise<GeneratedAudio> {
  // An offline context decodes without an audio device and without a click.
  const ctx = new OfflineAudioContext(1, 1, sampleRate);
  const buffer = await ctx.decodeAudioData(bytes);
  return { pcm: buffer.getChannelData(0).slice(), sampleRate: buffer.sampleRate };
}

function concat(parts: GeneratedAudio[]): GeneratedAudio {
  if (parts.length === 1) return parts[0]!;
  const pcm = new Float32Array(parts.reduce((n, p) => n + p.pcm.length, 0));
  let offset = 0;
  for (const part of parts) {
    pcm.set(part.pcm, offset);
    offset += part.pcm.length;
  }
  return { pcm, sampleRate: parts[0]!.sampleRate };
}

/** One sentence spoken by a cloud voice, as PCM. */
export async function speakCloudSentence(text: string, { voice, rate }: { voice: string; rate: number }, signal?: AbortSignal): Promise<GeneratedAudio> {
  const parts: GeneratedAudio[] = [];
  for (const chunk of chunkText(text)) parts.push(await decodeMp3(await fetchCloudChunk(chunk, voice, rate, signal)));
  if (parts.length === 0) return { pcm: new Float32Array(0), sampleRate: 24_000 };
  return concat(parts);
}

/**
 * Runs `task` for every index with at most `limit` at once and hands the
 * results to `consume` in order (the MP3 is written sentence by sentence).
 */
export async function inOrder<T>(count: number, limit: number, task: (i: number) => Promise<T>, consume: (value: T, i: number) => Promise<void>): Promise<void> {
  const running = new Map<number, Promise<T>>();
  let next = 0;
  const fill = () => {
    while (next < count && running.size < limit) {
      const promise = task(next);
      promise.catch(() => {});
      running.set(next++, promise);
    }
  };
  fill();
  for (let i = 0; i < count; i++) {
    const value = await running.get(i)!;
    running.delete(i);
    fill();
    await consume(value, i);
  }
}
