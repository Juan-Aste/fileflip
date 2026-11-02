import type { Locale } from "@/i18n/routing";

// Cloud voices (task 13.3, Google Cloud Text-to-Speech). Client-safe: only
// public voice names, never anything about the server's key. WaveNet voices
// are free up to 4 million characters a month and US$4 per million after
// that (docs/tts-nube.md). The first voice of each language is the default
// one until the samples are measured (scripts/tts/cloud-samples.mjs).

export interface CloudVoice {
  /** Google voice name, e.g. "es-US-Wavenet-A". */
  id: string;
  /** BCP-47 language code sent with the voice. */
  languageCode: string;
  gender: "female" | "male";
}

export const cloudVoices: Record<Locale, CloudVoice[]> = {
  es: [
    { id: "es-US-Wavenet-A", languageCode: "es-US", gender: "female" },
    { id: "es-US-Wavenet-B", languageCode: "es-US", gender: "male" },
    { id: "es-ES-Wavenet-C", languageCode: "es-ES", gender: "female" },
  ],
  en: [
    { id: "en-US-Wavenet-F", languageCode: "en-US", gender: "female" },
    { id: "en-US-Wavenet-D", languageCode: "en-US", gender: "male" },
    { id: "en-US-Wavenet-H", languageCode: "en-US", gender: "female" },
  ],
  pt: [
    { id: "pt-BR-Wavenet-A", languageCode: "pt-BR", gender: "female" },
    { id: "pt-BR-Wavenet-B", languageCode: "pt-BR", gender: "male" },
    { id: "pt-BR-Wavenet-C", languageCode: "pt-BR", gender: "female" },
  ],
  fr: [
    { id: "fr-FR-Wavenet-A", languageCode: "fr-FR", gender: "female" },
    { id: "fr-FR-Wavenet-B", languageCode: "fr-FR", gender: "male" },
    { id: "fr-FR-Wavenet-C", languageCode: "fr-FR", gender: "female" },
  ],
  zh: [
    { id: "cmn-CN-Wavenet-A", languageCode: "cmn-CN", gender: "female" },
    { id: "cmn-CN-Wavenet-B", languageCode: "cmn-CN", gender: "male" },
    { id: "cmn-CN-Wavenet-D", languageCode: "cmn-CN", gender: "female" },
  ],
};

const byId = new Map(Object.values(cloudVoices).flat().map((v) => [v.id, v]));

export function cloudVoice(id: unknown): CloudVoice | undefined {
  return typeof id === "string" ? byId.get(id) : undefined;
}

/** The API refuses inputs over 5000 bytes; each request is one sentence or chunk. */
export const CLOUD_MAX_BYTES = 5000;
/** Characters per request, below the byte limit for any script (CJK is 3 bytes a character). */
export const CLOUD_MAX_CHARS = 1500;

/** Speed range accepted by the API (speakingRate 0.25–4); the reader uses 0.5–2. */
export const CLOUD_MIN_RATE = 0.5;
export const CLOUD_MAX_RATE = 2;
