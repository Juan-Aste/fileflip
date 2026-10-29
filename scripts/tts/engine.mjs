// Node helpers for the AI voice scripts (samples, WER, quantized models): the
// site's own Supertonic pipeline (src/lib/tts/supertonic.ts) and Whisper
// (src/lib/transcribe/whisper.ts) on onnxruntime-web with one thread, as in
// the browser. Model folders: SUPERTONIC_DIR (pinned files of
// src/lib/tts/model.ts) and WHISPER_DIR (tiny/ and base/, as in whisper.test.ts).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const jiti = createJiti(import.meta.url);
const ort = await import("onnxruntime-web");
ort.env.wasm.numThreads = 1;
ort.env.logLevel = "error";

const json = (dir, p) => JSON.parse(readFileSync(join(dir, p), "utf8"));

/** Loads Supertonic from `dir`; `onnxDir` can point at other (quantized) ONNX files with the same names. */
export async function loadSupertonic(dir = process.env.SUPERTONIC_DIR, onnxDir = join(dir, "onnx")) {
  if (!dir) throw new Error("SUPERTONIC_DIR is not set");
  const tts = await jiti.import(join(root, "src/lib/tts/supertonic.ts"));
  const session = (name) => ort.InferenceSession.create(new Uint8Array(readFileSync(join(onnxDir, `${name}.onnx`))));
  const sessions = {
    durationPredictor: await session("duration_predictor"),
    textEncoder: await session("text_encoder"),
    vectorEstimator: await session("vector_estimator"),
    vocoder: await session("vocoder"),
  };
  const cfg = tts.parseConfig(json(dir, "onnx/tts.json"));
  const indexer = tts.parseIndexer(json(dir, "onnx/unicode_indexer.json"));
  const styles = new Map();
  const style = (voice) => {
    if (!styles.has(voice)) styles.set(voice, tts.parseVoiceStyle(json(dir, `voice_styles/${voice}.json`)));
    return styles.get(voice);
  };
  return {
    sampleRate: cfg.sampleRate,
    /** Mono float PCM at `sampleRate`; same defaults as the site (speed 1.05, 5 steps, seed 1). */
    speak: (text, { lang, voice, steps, seed = 1, speed }) => tts.synthesize(ort, sessions, cfg, indexer, text, { lang, voice: style(voice), steps, seed, speed }),
    preprocess: tts.preprocessText,
  };
}

/** Joins pieces of PCM with `gap` seconds of silence between them. */
export function join_(parts, sampleRate, gap = 0.35) {
  const silence = Math.round(sampleRate * gap);
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0) + silence * Math.max(0, parts.length - 1));
  let at = 0;
  parts.forEach((p, i) => {
    out.set(p, at);
    at += p.length + (i < parts.length - 1 ? silence : 0);
  });
  return out;
}
export { join_ as joinPcm };

/** Float PCM → 16 kHz mono float with ffmpeg (Whisper's input). */
export function resample16k(pcm, sampleRate) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-f", "f32le", "-ar", String(sampleRate), "-ac", "1", "-i", "-", "-ar", "16000", "-f", "f32le", "-"], { input: Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength), maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}

export async function loadWhisper(size = "base", dir = process.env.WHISPER_DIR) {
  if (!dir) throw new Error("WHISPER_DIR is not set");
  const w = await jiti.import(join(root, "src/lib/transcribe/whisper.ts"));
  const base = join(dir, size);
  const session = (name) => ort.InferenceSession.create(new Uint8Array(readFileSync(join(base, "onnx", `${name}.onnx`))));
  const sessions = { encoder: await session("encoder_model_quantized"), decoder: await session("decoder_model_merged_quantized") };
  const cfg = w.parseGenerationConfig(json(base, "generation_config.json"));
  const tokenizer = w.parseTokenizer(json(base, "tokenizer.json"));
  return {
    /** Text of 16 kHz mono audio in `language`. */
    async transcribe(pcm16k, language) {
      const { segments } = await w.transcribe(ort, sessions, cfg, tokenizer, pcm16k, { language });
      return segments.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
    },
  };
}

/** Words for WER: lowercase, without punctuation or accents marks kept as letters ("fecha", "dos mil veintiséis"). */
export function words(text) {
  return text.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}' -]+/gu, " ").replace(/-/g, " ").split(/\s+/).filter(Boolean);
}

/** Word error rate: (substitutions + deletions + insertions) / reference words, and the counts. */
export function wer(reference, hypothesis) {
  const r = words(reference);
  const h = words(hypothesis);
  const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...new Array(h.length).fill(0)]);
  for (let j = 1; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return { errors: d[r.length][h.length], words: r.length, wer: r.length ? d[r.length][h.length] / r.length : 0 };
}
