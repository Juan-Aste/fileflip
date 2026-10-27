import type { TtsLanguage } from "./text";

// The device's voices (Web Speech API) for one language. Browsers report
// tags as "es-ES", "es_ES" (Android) or "cmn-CN"; online voices (Google and
// Microsoft voices in Chrome and Edge) send the text to their provider, so
// the list marks them and puts the device's own voices first.

export interface VoiceLike {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
  default: boolean;
}

/** Speech rates offered: 0.5× to 2× in steps of 0.25. */
export const SPEECH_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** BCP 47 tag each language is read with when no voice is chosen. */
export const speechLang: Record<TtsLanguage, string> = { es: "es-ES", en: "en-US", pt: "pt-BR", fr: "fr-FR", zh: "zh-CN" };

const CHINESE = new Set(["zh", "cmn", "yue", "wuu", "hak", "nan"]);

/** The site language a voice speaks, or null for others. */
export function voiceLanguage(voice: Pick<VoiceLike, "lang">): TtsLanguage | null {
  const primary = voice.lang.replace(/_/g, "-").split("-")[0]!.toLowerCase();
  if (CHINESE.has(primary)) return "zh";
  return (["es", "en", "pt", "fr"] as const).find((l) => l === primary) ?? null;
}

/** Voices for `language`: the device's own first, then the browser's default, then by name. */
export function voicesFor<T extends VoiceLike>(voices: readonly T[], language: TtsLanguage): T[] {
  return voices
    .filter((v) => voiceLanguage(v) === language)
    .sort((a, b) => Number(b.localService) - Number(a.localService) || Number(b.default) - Number(a.default) || a.name.localeCompare(b.name));
}

/** The voice to start with: the one remembered if it is still there, else the first of the list. */
export function defaultVoice<T extends VoiceLike>(voices: readonly T[], remembered: string | null): T | undefined {
  return voices.find((v) => v.voiceURI === remembered) ?? voices[0];
}

/** Nearest offered rate (a remembered value may be anything). */
export function clampRate(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return SPEECH_RATES.reduce((best, r) => (Math.abs(r - n) < Math.abs(best - n) ? r : best), 1);
}
