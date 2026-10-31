// Short recordings of each AI voice in each language, made with the real model
// by scripts/tts/samples.mjs and served as static files (public/tts-samples/),
// so a voice can be heard before the ~400 MB model is downloaded. The list
// (sizes and SHA-256) is written by the script in samples.json.
import type { SupertonicLanguage } from "./supertonic";
import type { SupertonicVoice } from "./model";
import list from "./samples.json";

/** The same natural sentence per language, with a number and a date (read through the site's normalization). */
export const SAMPLE_TEXT: Readonly<Record<SupertonicLanguage, string>> = {
  es: "Hola, esta es mi voz. El 28 de octubre de 2026 leí 3 capítulos de un tirón.",
  en: "Hello, this is my voice. On October 28, 2026, I read 3 chapters in one sitting.",
  pt: "Olá, esta é a minha voz. Em 28 de outubro de 2026, li 3 capítulos seguidos.",
  fr: "Bonjour, voici ma voix. Le 28 octobre 2026, j'ai lu 3 chapitres d'une traite.",
};

export interface VoiceSample {
  lang: SupertonicLanguage;
  voice: SupertonicVoice;
  /** Path under public/ ("/tts-samples/es-F1.mp3"). */
  path: string;
  bytes: number;
  sha256: string;
  seconds: number;
}

export const voiceSamples = list as readonly VoiceSample[];

export const sampleFor = (lang: SupertonicLanguage, voice: SupertonicVoice) => voiceSamples.find((s) => s.lang === lang && s.voice === voice);

export { RECOMMENDED_VOICE, samplePath } from "./recommended";
