import type { TtsLanguage } from "./text";

// The device's voices (Web Speech API) for one language. Browsers report
// tags as "es-ES", "es_ES" (Android) or "cmn-CN". The list is sorted best
// first (task 13.2, heuristic in docs/tts-voces-dispositivo.md): neural or
// "natural" voices before the old robotic ones, then the region closest to
// the site's audience (for Spanish: Argentina, then Latin America and the US,
// then Spain), then the browser's default, then the device's own voices
// before online ones. Online voices (Google and Microsoft voices in Chrome
// and Edge) send the text to their provider: the reader marks them.

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

/**
 * How natural a voice sounds, from its name: neural voices ("Natural",
 * "Neural": Edge, Windows 11; "Premium", "Enhanced": Apple's downloadable
 * ones) before the online Google/Microsoft voices, before the rest. Apple's
 * novelty voices (Bells, Zarvox…) go last.
 */
export function voiceQuality(voice: Pick<VoiceLike, "name">): number {
  const name = voice.name;
  if (NOVELTY.test(name)) return -1;
  if (/\b(natural|neural)\b/i.test(name)) return 3;
  if (/\b(premium|enhanced|mejorada|aprimorada|améliorée)\b/i.test(name)) return 2;
  if (/\b(online|google)\b/i.test(name)) return 1;
  return 0;
}

const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox)\b/i;

/** Latin American Spanish regions (UN M.49 419 and the countries in it, plus the US). */
const LATAM = new Set(["419", "US", "MX", "CO", "CL", "PE", "VE", "EC", "GT", "CU", "BO", "DO", "HN", "PY", "SV", "NI", "CR", "PA", "UY", "PR"]);

/** Region tiers per language, best first; regions not listed rank after all of them. */
const REGIONS: Record<TtsLanguage, (region: string) => number> = {
  es: (r) => (r === "AR" ? 3 : LATAM.has(r) ? 2 : r === "ES" ? 1 : 0),
  pt: (r) => (r === "BR" ? 2 : r === "PT" ? 1 : 0),
  en: (r) => (r === "US" ? 2 : r === "GB" ? 1 : 0),
  fr: (r) => (r === "FR" ? 2 : r === "CA" ? 1 : 0),
  zh: (r) => (r === "CN" || r === "HANS" ? 2 : r === "TW" || r === "HANT" ? 1 : 0),
};

/** Region of a tag ("es_AR" → "AR", "cmn-Hans-CN" → "CN", "es-419" → "419"). */
function region(lang: string): string {
  const parts = lang.replace(/_/g, "-").split("-").slice(1).map((p) => p.toUpperCase());
  return parts.find((p) => /^([A-Z]{2}|\d{3})$/.test(p)) ?? parts[0] ?? "";
}

/** Voices for `language`, best first (see the comment at the top). */
export function voicesFor<T extends VoiceLike>(voices: readonly T[], language: TtsLanguage): T[] {
  const tier = REGIONS[language];
  return voices
    .filter((v) => voiceLanguage(v) === language)
    .sort(
      (a, b) =>
        voiceQuality(b) - voiceQuality(a) ||
        tier(region(b.lang)) - tier(region(a.lang)) ||
        Number(b.default) - Number(a.default) ||
        Number(b.localService) - Number(a.localService) ||
        a.name.localeCompare(b.name),
    );
}

/** The voice to start with: the one remembered if it is still there, else the best (first) of the list. */
export function defaultVoice<T extends VoiceLike>(voices: readonly T[], remembered: string | null): T | undefined {
  return voices.find((v) => v.voiceURI === remembered) ?? voices[0];
}

/** Nearest offered rate (a remembered value may be anything). */
export function clampRate(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return SPEECH_RATES.reduce((best, r) => (Math.abs(r - n) < Math.abs(best - n) ? r : best), 1);
}
