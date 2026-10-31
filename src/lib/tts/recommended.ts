// What the page needs about the AI voice samples, without the list of sizes
// and SHA-256 (samples.ts, used by the tests and scripts).
import type { SupertonicVoice } from "./model";
import type { SupertonicLanguage } from "./supertonic";

/**
 * Voice with the lowest word error rate per language when its speech is
 * transcribed by Whisper `base` (scripts/tts/wer.mjs, table in docs/tts-wer.md).
 */
export const RECOMMENDED_VOICE: Readonly<Record<SupertonicLanguage, SupertonicVoice>> = { es: "F5", en: "M2", pt: "F5", fr: "M5" };

/** Static recording of a voice (public/tts-samples/, made by scripts/tts/samples.mjs). */
export const samplePath = (lang: SupertonicLanguage, voice: SupertonicVoice) => `/tts-samples/${lang}-${voice}.mp3`;
