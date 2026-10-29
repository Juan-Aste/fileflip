// Supertonic 3 inference: text → character ids → duration predictor → text
// encoder → flow-matching vector estimator (a few denoising steps) → vocoder.
// Ported from the MIT-licensed reference SDK (PyPI `supertonic` 1.3.1,
// Copyright (c) 2025 Supertone Inc.): the same text normalization, masks and
// noise shapes. Independent of onnxruntime so the text side is unit-tested;
// the ONNX runtime and sessions are passed in (see src/workers/tts.worker.ts).

import type { InferenceSession, Tensor } from "onnxruntime-web";
import { normalizeNumbers } from "./normalize";

/** The parts of `onnx/tts.json` the pipeline needs. */
export interface SupertonicConfig {
  sampleRate: number;
  baseChunkSize: number;
  chunkCompressFactor: number;
  latentDim: number;
}

export function parseConfig(json: unknown): SupertonicConfig {
  const cfg = json as { ae?: { sample_rate?: unknown; base_chunk_size?: unknown }; ttl?: { chunk_compress_factor?: unknown; latent_dim?: unknown } };
  const values = [cfg.ae?.sample_rate, cfg.ae?.base_chunk_size, cfg.ttl?.chunk_compress_factor, cfg.ttl?.latent_dim];
  if (!values.every((v) => Number.isInteger(v) && (v as number) > 0)) throw new Error("Invalid Supertonic config");
  const [sampleRate, baseChunkSize, chunkCompressFactor, latentDim] = values as number[];
  return { sampleRate: sampleRate!, baseChunkSize: baseChunkSize!, chunkCompressFactor: chunkCompressFactor!, latentDim: latentDim! };
}

/** `onnx/unicode_indexer.json`: model id for each UTF-16 code point, -1 when unsupported. */
export function parseIndexer(json: unknown): Int32Array {
  if (!Array.isArray(json) || json.length !== 0x10000 || !json.every((v) => Number.isInteger(v))) throw new Error("Invalid Supertonic indexer");
  return Int32Array.from(json as number[]);
}

/** A preset voice (`voice_styles/*.json`): style vectors for the text-to-latent model and the duration predictor. */
export interface VoiceStyle {
  ttl: { data: Float32Array; dims: number[] };
  dp: { data: Float32Array; dims: number[] };
}

function styleTensor(json: unknown) {
  const { dims, data } = (json ?? {}) as { dims?: unknown; data?: unknown };
  if (!Array.isArray(dims) || !dims.every((d) => Number.isInteger(d) && d > 0) || dims[0] !== 1) throw new Error("Invalid voice style");
  const flat = (Array.isArray(data) ? data.flat(Infinity) : []) as unknown[];
  const size = (dims as number[]).reduce((a, b) => a * b, 1);
  if (flat.length !== size || !flat.every((v) => typeof v === "number" && Number.isFinite(v))) throw new Error("Invalid voice style");
  return { data: Float32Array.from(flat as number[]), dims: dims as number[] };
}

export function parseVoiceStyle(json: unknown): VoiceStyle {
  const style = (json ?? {}) as { style_ttl?: unknown; style_dp?: unknown };
  return { ttl: styleTensor(style.style_ttl), dp: styleTensor(style.style_dp) };
}

/** Languages the site offers with the AI voice (the model has 31; Chinese is not one of them). */
export type SupertonicLanguage = "es" | "en" | "pt" | "fr";

const EMOJI = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu;

const SYMBOLS: [string, string][] = [
  ["–", "-"], ["‑", "-"], ["—", "-"], ["¯", " "], ["_", " "],
  ["“", '"'], ["”", '"'], ["‘", "'"], ["’", "'"], ["´", "'"], ["`", "'"],
  ["[", " "], ["]", " "], ["|", " "], ["/", " "], ["#", " "], ["→", " "], ["←", " "],
];

// "@" is read as a word; the reference SDK only knows English.
const AT: Record<SupertonicLanguage, string> = { en: " at ", es: " arroba ", pt: " arroba ", fr: " arobase " };

/**
 * Numbers, dates and symbols in words (the model does not read digits well,
 * see normalize.ts), the reference SDK's normalization, then the language
 * tags the multilingual model expects.
 */
export function preprocessText(text: string, lang: SupertonicLanguage): string {
  let t = normalizeNumbers(text, lang).normalize("NFKD").replace(EMOJI, "");
  for (const [from, to] of SYMBOLS) t = t.replaceAll(from, to);
  t = t.replace(/[♥☆♡©\\]/g, "").replaceAll("@", AT[lang]);
  if (lang === "en") t = t.replaceAll("e.g.,", "for example, ").replaceAll("i.e.,", "that is, ");
  t = t.replace(/ ([,.!?;:'])/g, "$1").replace(/(["'`])\1+/g, "$1").replace(/\s+/g, " ").trim();
  if (!/[.!?;:,'")\]}…。」』】〉》›»]$/.test(t)) t += ".";
  return `<${lang}>${t}</${lang}>`;
}

/** Model ids of the preprocessed text; characters the model does not know are left out. */
export function textToIds(text: string, lang: SupertonicLanguage, indexer: Int32Array): number[] {
  const ids: number[] = [];
  for (const char of preprocessText(text, lang)) {
    const code = char.codePointAt(0)!;
    const id = code < indexer.length ? indexer[code]! : -1;
    if (id >= 0) ids.push(id);
  }
  return ids;
}

/** Number of latent frames for `seconds` of audio, as the reference SDK rounds it. */
export function latentFrames(seconds: number, cfg: SupertonicConfig): number {
  const chunk = cfg.baseChunkSize * cfg.chunkCompressFactor;
  return Math.max(1, Math.floor((Math.floor(seconds * cfg.sampleRate) + chunk - 1) / chunk));
}

/** Deterministic standard normal noise (mulberry32 + Box–Muller), so a seed reproduces a take. */
export function gaussianNoise(length: number, seed: number): Float32Array {
  let s = seed >>> 0;
  const uniform = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 2) {
    const u = 1 - uniform();
    const r = Math.sqrt(-2 * Math.log(u));
    const a = 2 * Math.PI * uniform();
    out[i] = r * Math.cos(a);
    if (i + 1 < length) out[i + 1] = r * Math.sin(a);
  }
  return out;
}

/** Speed range the model accepts (1.05 sounds most natural). */
export const MODEL_MIN_SPEED = 0.7;
export const MODEL_MAX_SPEED = 2;
/** Denoising steps: the SDK uses 8; fewer is faster with little loss (measured in docs/tts-voz-ia.md). */
export const DEFAULT_STEPS = 5;

export interface SupertonicSessions {
  durationPredictor: InferenceSession;
  textEncoder: InferenceSession;
  vectorEstimator: InferenceSession;
  vocoder: InferenceSession;
}

type Ort = { Tensor: typeof Tensor };

export interface SynthesizeOptions {
  lang: SupertonicLanguage;
  voice: VoiceStyle;
  /** Model speed, clamped to 0.7–2. */
  speed?: number;
  steps?: number;
  seed?: number;
  /** Called after each step (0–1), and checked to stop early. */
  onStep?: (fraction: number) => void;
  shouldStop?: () => boolean;
}

/** One utterance (a sentence or a short chunk) as mono float PCM at `cfg.sampleRate`. */
export async function synthesize(
  ort: Ort,
  sessions: SupertonicSessions,
  cfg: SupertonicConfig,
  indexer: Int32Array,
  text: string,
  { lang, voice, speed = 1.05, steps = DEFAULT_STEPS, seed = 1, onStep, shouldStop }: SynthesizeOptions,
): Promise<Float32Array> {
  const ids = textToIds(text, lang, indexer);
  const n = ids.length;
  const textIds = new ort.Tensor("int64", BigInt64Array.from(ids, (v) => BigInt(v)), [1, n]);
  const textMask = new ort.Tensor("float32", new Float32Array(n).fill(1), [1, 1, n]);
  const styleTtl = new ort.Tensor("float32", voice.ttl.data, voice.ttl.dims);
  const styleDp = new ort.Tensor("float32", voice.dp.data, voice.dp.dims);
  const owned: Tensor[] = [textIds, textMask, styleTtl, styleDp];
  const dispose = (outputs: Record<string, Tensor>) => owned.push(...Object.values(outputs));
  try {
    const dp = await sessions.durationPredictor.run({ text_ids: textIds, style_dp: styleDp, text_mask: textMask });
    dispose(dp);
    const rawSeconds = (Object.values(dp)[0]!.data as Float32Array)[0]!;
    const seconds = rawSeconds / Math.min(MODEL_MAX_SPEED, Math.max(MODEL_MIN_SPEED, speed));
    if (!(seconds > 0) || !Number.isFinite(seconds)) throw new Error("Invalid duration");

    const enc = await sessions.textEncoder.run({ text_ids: textIds, style_ttl: styleTtl, text_mask: textMask });
    dispose(enc);
    const textEmb = Object.values(enc)[0]!;

    const frames = latentFrames(seconds, cfg);
    const dim = cfg.latentDim * cfg.chunkCompressFactor;
    let xt: Tensor = new ort.Tensor("float32", gaussianNoise(dim * frames, seed), [1, dim, frames]);
    const latentMask = new ort.Tensor("float32", new Float32Array(frames).fill(1), [1, 1, frames]);
    const totalStep = new ort.Tensor("float32", Float32Array.of(steps), [1]);
    owned.push(xt, latentMask, totalStep);
    for (let step = 0; step < steps; step++) {
      if (shouldStop?.()) throw new Error("stopped");
      const currentStep = new ort.Tensor("float32", Float32Array.of(step), [1]);
      owned.push(currentStep);
      const out = await sessions.vectorEstimator.run({
        noisy_latent: xt,
        text_emb: textEmb,
        style_ttl: styleTtl,
        text_mask: textMask,
        latent_mask: latentMask,
        current_step: currentStep,
        total_step: totalStep,
      });
      dispose(out);
      xt = Object.values(out)[0]!;
      onStep?.((step + 1) / (steps + 1));
    }
    const voc = await sessions.vocoder.run({ latent: xt });
    dispose(voc);
    const wav = Object.values(voc)[0]!.data as Float32Array;
    onStep?.(1);
    // The vocoder pads to whole latent frames: keep the predicted length.
    return wav.slice(0, Math.min(wav.length, Math.round(seconds * cfg.sampleRate)));
  } finally {
    for (const t of owned) t.dispose();
  }
}
