import { createJobPool, type JobOptions } from "@/lib/jobs";
import { modelsBaseUrl } from "@/lib/models/sources";
import { bytesToDownload, openModelStore } from "./model-cache";
import { supertonicFiles, supertonicSources, supertonicVoiceFiles, type SupertonicVoice } from "./model";
import { aiVoiceWorkers } from "./parallel";
import type { SupertonicLanguage } from "./supertonic";

// The AI voice from the page: one worker holding the model, started the
// first time the user picks "AI voice" or "Download MP3" (never on page load).
// Cancelling the download terminates the worker; cancelling a reading just
// stops asking for sentences, so the loaded model is kept. On computers with
// spare cores two workers generate sentences in parallel (./parallel.ts);
// `prepare` downloads and loads the model in one of them, the other loads it
// from the cache with its first sentence.

const pool = createJobPool(() => new Worker(new URL("../../workers/tts.worker.ts", import.meta.url), { type: "module" }), {
  concurrency: aiVoiceWorkers(),
});

/** Bytes still to download before the first sentence (0 when everything is cached). */
export async function aiVoiceDownloadBytes(voice: SupertonicVoice): Promise<number> {
  const base = modelsBaseUrl();
  return bytesToDownload([...supertonicFiles, supertonicVoiceFiles[voice]].map((f) => supertonicSources(f, base)), await openModelStore());
}

/** Loads the model and a voice (downloading what is not cached); progress 0–1 by bytes. */
export const prepareAiVoice = (voice: SupertonicVoice, job: JobOptions = {}) =>
  pool.run<{ sampleRate: number }>("prepare", { voice, base: modelsBaseUrl() }, job);

export interface AiSpeech {
  pcm: Float32Array;
  sampleRate: number;
}

/** One sentence spoken by the AI voice. `speed` is the model's (0.7–2). */
export async function speakAiSentence(
  text: string,
  { lang, voice, speed, steps, seed }: { lang: SupertonicLanguage; voice: SupertonicVoice; speed: number; steps?: number; seed?: number },
  job: Omit<JobOptions, "transfer"> = {},
): Promise<AiSpeech> {
  const { pcm, sampleRate } = await pool.run<{ pcm: ArrayBuffer; sampleRate: number }>("speak", { text, lang, voice, speed, steps, seed, base: modelsBaseUrl() }, job);
  return { pcm: new Float32Array(pcm), sampleRate };
}

/** Frees the model (hundreds of MB of memory), e.g. when leaving the page. */
export const disposeAiVoice = () => pool.dispose();
