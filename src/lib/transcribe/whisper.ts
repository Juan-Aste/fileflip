// Whisper inference with onnxruntime-web: log-mel features, the encoder, the
// merged decoder with its key/value cache, OpenAI's timestamp rules and the
// byte-level BPE tokenizer. Sequential 30 s windows as in openai/whisper's
// transcribe(): each window starts where the last complete segment ended.
// Pure functions plus `transcribe()`, so it runs in a worker or in Node tests.
import type { InferenceSession, Tensor } from "onnxruntime-web";

export const SAMPLE_RATE = 16000;
const N_FFT = 400;
const HOP = 160;
const N_MELS = 80;
const CHUNK_SAMPLES = 30 * SAMPLE_RATE;
const N_FRAMES = CHUNK_SAMPLES / HOP; // 3000
/** Seconds per timestamp token (<|0.02|> steps). */
const TIME_PRECISION = 0.02;
const MAX_TOKENS = 448;

type Ort = Pick<typeof import("onnxruntime-web"), "Tensor">;

// ---------------------------------------------------------------- features

let melFilters: Float32Array | null = null;
let dft: { cos: Float32Array; sin: Float32Array; window: Float32Array } | null = null;

const hzToMel = (hz: number) => (hz < 1000 ? (hz * 3) / 200 : 15 + (27 * Math.log(hz / 1000)) / Math.log(6.4));
const melToHz = (mel: number) => (mel < 15 ? (mel * 200) / 3 : 1000 * Math.exp((Math.log(6.4) * (mel - 15)) / 27));

/** librosa.filters.mel(sr=16000, n_fft=400, n_mels=80) (Slaney scale and area normalization), as Whisper uses. */
export function whisperMelFilters(): Float32Array {
  if (melFilters) return melFilters;
  const bins = N_FFT / 2 + 1;
  const fftFreqs = Array.from({ length: bins }, (_, i) => (i * SAMPLE_RATE) / N_FFT);
  const top = hzToMel(SAMPLE_RATE / 2);
  const melPoints = Array.from({ length: N_MELS + 2 }, (_, i) => melToHz((i * top) / (N_MELS + 1)));
  const out = new Float32Array(N_MELS * bins);
  for (let m = 0; m < N_MELS; m++) {
    const [lo, mid, hi] = [melPoints[m]!, melPoints[m + 1]!, melPoints[m + 2]!];
    const norm = 2 / (hi - lo);
    for (let k = 0; k < bins; k++) {
      const f = fftFreqs[k]!;
      const w = Math.max(0, Math.min((f - lo) / (mid - lo), (hi - f) / (hi - mid)));
      out[m * bins + k] = w * norm;
    }
  }
  return (melFilters = out);
}

function dftTables() {
  if (dft) return dft;
  const bins = N_FFT / 2 + 1;
  const cos = new Float32Array(bins * N_FFT);
  const sin = new Float32Array(bins * N_FFT);
  for (let k = 0; k < bins; k++)
    for (let n = 0; n < N_FFT; n++) {
      const a = (2 * Math.PI * k * n) / N_FFT;
      cos[k * N_FFT + n] = Math.cos(a);
      sin[k * N_FFT + n] = Math.sin(a);
    }
  // Periodic Hann window (torch.hann_window).
  const window = Float32Array.from({ length: N_FFT }, (_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / N_FFT));
  return (dft = { cos, sin, window });
}

/**
 * Whisper's input for up to 30 s of 16 kHz mono audio: 80×3000 log-mel values
 * (padded with silence), as WhisperFeatureExtractor computes them.
 */
export function logMelSpectrogram(samples: Float32Array): Float32Array {
  const audio = new Float32Array(CHUNK_SAMPLES);
  audio.set(samples.subarray(0, CHUNK_SAMPLES));
  // STFT with center=True: reflect-pad by n_fft/2 on both sides.
  const pad = N_FFT / 2;
  const padded = new Float32Array(CHUNK_SAMPLES + 2 * pad);
  padded.set(audio, pad);
  for (let i = 0; i < pad; i++) {
    padded[pad - 1 - i] = audio[i + 1]!;
    padded[pad + CHUNK_SAMPLES + i] = audio[CHUNK_SAMPLES - 2 - i]!;
  }
  const { cos, sin, window } = dftTables();
  const filters = whisperMelFilters();
  const bins = N_FFT / 2 + 1;
  const frame = new Float32Array(N_FFT);
  const power = new Float32Array(bins);
  const mel = new Float32Array(N_MELS * N_FRAMES);
  let max = -Infinity;
  // The STFT has 3001 frames; Whisper drops the last one.
  for (let t = 0; t < N_FRAMES; t++) {
    const start = t * HOP;
    for (let n = 0; n < N_FFT; n++) frame[n] = padded[start + n]! * window[n]!;
    for (let k = 0; k < bins; k++) {
      let re = 0;
      let im = 0;
      const row = k * N_FFT;
      for (let n = 0; n < N_FFT; n++) {
        re += frame[n]! * cos[row + n]!;
        im -= frame[n]! * sin[row + n]!;
      }
      power[k] = re * re + im * im;
    }
    for (let m = 0; m < N_MELS; m++) {
      let sum = 0;
      const row = m * bins;
      for (let k = 0; k < bins; k++) sum += filters[row + k]! * power[k]!;
      const v = Math.log10(Math.max(sum, 1e-10));
      mel[m * N_FRAMES + t] = v;
      if (v > max) max = v;
    }
  }
  for (let i = 0; i < mel.length; i++) mel[i] = (Math.max(mel[i]!, max - 8) + 4) / 4;
  return mel;
}

// ---------------------------------------------------------------- tokenizer

export interface WhisperTokenizer {
  /** Token id → text, or null for special tokens. */
  decode(ids: readonly number[]): string;
  idOf(token: string): number | undefined;
}

/** GPT-2's byte ↔ printable-character map used by byte-level BPE. */
function byteDecoder(): Map<string, number> {
  const bytes: number[] = [];
  for (let b = 33; b <= 126; b++) bytes.push(b);
  for (let b = 161; b <= 172; b++) bytes.push(b);
  for (let b = 174; b <= 255; b++) bytes.push(b);
  const chars = [...bytes];
  let n = 0;
  for (let b = 0; b < 256; b++)
    if (!bytes.includes(b)) {
      bytes.push(b);
      chars.push(256 + n++);
    }
  return new Map(bytes.map((b, i) => [String.fromCodePoint(chars[i]!), b]));
}

interface TokenizerJson {
  model: { vocab: Record<string, number> };
  added_tokens: { id: number; content: string; special: boolean }[];
}

export function parseTokenizer(json: unknown): WhisperTokenizer {
  const data = json as TokenizerJson;
  const byId: string[] = [];
  const ids = new Map<string, number>();
  for (const [token, id] of Object.entries(data.model.vocab)) {
    byId[id] = token;
    ids.set(token, id);
  }
  const special = new Set<number>();
  for (const t of data.added_tokens) {
    byId[t.id] = t.content;
    ids.set(t.content, t.id);
    if (t.special) special.add(t.id);
  }
  const bytesOf = byteDecoder();
  const utf8 = new TextDecoder();
  return {
    idOf: (token) => ids.get(token),
    decode(list) {
      const bytes: number[] = [];
      for (const id of list) {
        if (special.has(id)) continue;
        for (const ch of byId[id] ?? "") {
          const b = bytesOf.get(ch);
          if (b !== undefined) bytes.push(b);
        }
      }
      return utf8.decode(new Uint8Array(bytes));
    },
  };
}

// ---------------------------------------------------------------- decoding

export interface GenerationConfig {
  decoderStart: number;
  eot: number;
  transcribe: number;
  noTimestamps: number;
  /** First timestamp token, <|0.00|>. */
  timestampBegin: number;
  suppress: readonly number[];
  beginSuppress: readonly number[];
  maxInitialTimestamp: number;
  /** "<|es|>" → token id. */
  languages: Readonly<Record<string, number>>;
}

interface GenerationJson {
  decoder_start_token_id: number;
  eos_token_id: number;
  no_timestamps_token_id: number;
  suppress_tokens: number[];
  begin_suppress_tokens: number[];
  max_initial_timestamp_index: number;
  lang_to_id: Record<string, number>;
  task_to_id: { transcribe: number };
}

export function parseGenerationConfig(json: unknown): GenerationConfig {
  const g = json as GenerationJson;
  return {
    decoderStart: g.decoder_start_token_id,
    eot: g.eos_token_id,
    transcribe: g.task_to_id.transcribe,
    noTimestamps: g.no_timestamps_token_id,
    timestampBegin: g.no_timestamps_token_id + 1,
    suppress: g.suppress_tokens,
    beginSuppress: g.begin_suppress_tokens,
    maxInitialTimestamp: g.max_initial_timestamp_index,
    languages: g.lang_to_id,
  };
}

/** Language codes Whisper knows ("es", "en", "zh"…). */
export const whisperLanguages = (cfg: GenerationConfig) => Object.keys(cfg.languages).map((k) => k.slice(2, -2));

function logSoftmax(logits: Float32Array, from: number, to: number): Float32Array {
  let max = -Infinity;
  for (let i = from; i < to; i++) if (logits[i]! > max) max = logits[i]!;
  let sum = 0;
  for (let i = from; i < to; i++) sum += Math.exp(logits[i]! - max);
  const log = Math.log(sum) + max;
  const out = new Float32Array(to - from);
  for (let i = from; i < to; i++) out[i - from] = logits[i]! - log;
  return out;
}

/**
 * OpenAI's ApplyTimestampRules (+ suppressed tokens) on one step's logits.
 * `sampled` are the tokens generated after the prompt.
 */
export function applyTimestampRules(logits: Float32Array, sampled: readonly number[], cfg: GenerationConfig) {
  const ts = cfg.timestampBegin;
  const vocab = logits.length;
  for (const id of cfg.suppress) if (id < vocab) logits[id] = -Infinity;
  logits[cfg.noTimestamps] = -Infinity;
  if (sampled.length === 0) for (const id of cfg.beginSuppress) logits[id] = -Infinity;
  const last = sampled.at(-1);
  const lastWasTimestamp = last !== undefined && last >= ts;
  const penultimateWasTimestamp = sampled.length < 2 || sampled.at(-2)! >= ts;
  if (lastWasTimestamp) {
    // A pair of timestamps closes a segment: text must follow; a lone one opens it: text or the closing one.
    if (penultimateWasTimestamp) logits.fill(-Infinity, ts);
    else logits.fill(-Infinity, 0, cfg.eot);
  }
  // Timestamps never go back (and a closed segment's end can't be reused as a start).
  const stamps = sampled.filter((t) => t >= ts);
  if (stamps.length) {
    const floor = lastWasTimestamp && !penultimateWasTimestamp ? stamps.at(-1)! : stamps.at(-1)! + 1;
    logits.fill(-Infinity, ts, floor);
  }
  if (sampled.length === 0) {
    // The first token is a timestamp, at most 1 s in.
    logits.fill(-Infinity, 0, ts);
    logits.fill(-Infinity, ts + cfg.maxInitialTimestamp + 1);
  }
  // If timestamps together are likelier than any single text token, pick a timestamp.
  const logprobs = logSoftmax(logits, 0, vocab);
  let maxText = -Infinity;
  for (let i = 0; i < ts; i++) if (logprobs[i]! > maxText) maxText = logprobs[i]!;
  let maxTs = -Infinity;
  for (let i = ts; i < vocab; i++) if (logprobs[i]! > maxTs) maxTs = logprobs[i]!;
  let sumTs = 0;
  for (let i = ts; i < vocab; i++) sumTs += Math.exp(logprobs[i]! - maxTs);
  if (Math.log(sumTs) + maxTs > maxText) logits.fill(-Infinity, 0, ts);
}

/**
 * Length of a loop at the end of `tokens` (the same 1–16 tokens 4 times in a
 * row: "3, 3, 3, 3…"), or 0. Greedy decoding with small models falls into
 * these; openai/whisper retries with temperature, we cut the loop instead.
 */
export function repetitionAt(tokens: readonly number[]): number {
  for (let period = 1; period <= 16; period++) {
    const span = period * 4;
    if (tokens.length < span) break;
    const end = tokens.length;
    let loop = true;
    for (let i = end - span; i < end - period && loop; i++) if (tokens[i] !== tokens[i + period]) loop = false;
    if (loop) return period;
  }
  return 0;
}

const argmax = (a: Float32Array, from = 0, to = a.length) => {
  let best = from;
  for (let i = from + 1; i < to; i++) if (a[i]! > a[best]!) best = i;
  return best;
};

export interface WhisperSessions {
  encoder: InferenceSession;
  decoder: InferenceSession;
}

/** One decoder run: the last position's logits and the new key/value cache. */
class Decoder {
  private past: Record<string, Tensor> | null = null;
  private readonly ort: Ort;
  private readonly session: InferenceSession;
  private readonly encoded: Tensor;
  constructor(ort: Ort, session: InferenceSession, encoded: Tensor) {
    this.ort = ort;
    this.session = session;
    this.encoded = encoded;
  }

  private emptyPast() {
    const feeds: Record<string, Tensor> = {};
    for (const name of this.session.inputNames) {
      if (!name.startsWith("past_key_values.")) continue;
      const meta = (this.session.inputMetadata as unknown as { name: string; shape: (number | string)[] }[] | undefined)?.find((m) => m.name === name);
      const heads = Number(meta?.shape[1]);
      const dim = Number(meta?.shape[3]);
      feeds[name] = new this.ort.Tensor("float32", new Float32Array(0), [1, heads, 0, dim]);
    }
    return feeds;
  }

  async step(ids: readonly number[]): Promise<Float32Array> {
    const first = this.past === null;
    const feeds: Record<string, Tensor> = {
      input_ids: new this.ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      encoder_hidden_states: this.encoded,
      use_cache_branch: new this.ort.Tensor("bool", [!first], [1]),
      ...(first ? this.emptyPast() : this.past!),
    };
    const out = await this.session.run(feeds);
    const next: Record<string, Tensor> = {};
    for (const [name, tensor] of Object.entries(out)) {
      if (!name.startsWith("present.")) continue;
      const key = name.replace("present.", "past_key_values.");
      // The cache branch passes the encoder's keys through unchanged: keep the first ones.
      next[key] = !first && name.includes(".encoder.") ? this.past![key]! : tensor;
    }
    this.past = next;
    const logits = out.logits!;
    const vocab = logits.dims[2]!;
    const data = logits.data as Float32Array;
    return data.slice(data.length - vocab);
  }
}

export interface Segment {
  /** Seconds from the start of the audio. */
  start: number;
  end: number;
  text: string;
}

export interface TranscribeOptions {
  /** "es", "en"…; detected from the first window when omitted. */
  language?: string;
  onProgress?: (done: number, total: number) => void;
  /** Checked between steps; throwing stops the work. */
  shouldStop?: () => boolean;
}

/** Most likely language of a window (Whisper's own detection: one decoder step after <|startoftranscript|>). */
export async function detectLanguage(ort: Ort, decoder: InferenceSession, encoded: Tensor, cfg: GenerationConfig): Promise<string> {
  const logits = await new Decoder(ort, decoder, encoded).step([cfg.decoderStart]);
  let best = "";
  let bestValue = -Infinity;
  for (const [token, id] of Object.entries(cfg.languages))
    if (logits[id]! > bestValue) {
      bestValue = logits[id]!;
      best = token.slice(2, -2);
    }
  return best;
}

async function encode(ort: Ort, session: InferenceSession, samples: Float32Array) {
  const features = new ort.Tensor("float32", logMelSpectrogram(samples), [1, N_MELS, N_FRAMES]);
  const out = await session.run({ input_features: features });
  return out.last_hidden_state!;
}

/** Tokens → segments: pairs of timestamps around text, times relative to `offset`. */
export function segmentsOf(tokens: readonly number[], cfg: GenerationConfig, tokenizer: WhisperTokenizer, offset: number) {
  const segments: Segment[] = [];
  let start: number | null = null;
  let text: number[] = [];
  let lastEnd: number | null = null;
  for (const t of tokens) {
    if (t >= cfg.timestampBegin) {
      const time = (t - cfg.timestampBegin) * TIME_PRECISION;
      if (start === null) start = time;
      else {
        const words = tokenizer.decode(text).trim();
        if (words) segments.push({ start: offset + start, end: offset + time, text: words });
        lastEnd = time;
        start = null;
        text = [];
      }
    } else if (t !== cfg.eot) text.push(t);
  }
  // Text after a lone timestamp: the window cut a segment; it is redone from there.
  return { segments, lastEnd, unfinished: start !== null ? start : null, tail: text };
}

/**
 * Transcribes 16 kHz mono audio of any length in 30 s windows. Returns the
 * segments (with times) and the language used.
 */
export async function transcribe(
  ort: Ort,
  sessions: WhisperSessions,
  cfg: GenerationConfig,
  tokenizer: WhisperTokenizer,
  audio: Float32Array,
  { language, onProgress, shouldStop }: TranscribeOptions = {},
): Promise<{ segments: Segment[]; language: string }> {
  const segments: Segment[] = [];
  let seek = 0;
  let lang = language;
  while (seek < audio.length) {
    if (shouldStop?.()) throw new Error("stopped");
    const window = audio.subarray(seek, seek + CHUNK_SAMPLES);
    const windowSeconds = window.length / SAMPLE_RATE;
    // Less than a tenth of a second left: nothing to hear.
    if (windowSeconds < 0.1) break;
    const encoded = await encode(ort, sessions.encoder, window);
    lang ??= await detectLanguage(ort, sessions.decoder, encoded, cfg);
    const langId = cfg.languages[`<|${lang}|>`];
    if (langId === undefined) throw new Error(`Unknown language ${lang}`);
    const prompt = [cfg.decoderStart, langId, cfg.transcribe];
    const decoder = new Decoder(ort, sessions.decoder, encoded);
    const sampled: number[] = [];
    let logits = await decoder.step(prompt);
    while (sampled.length < MAX_TOKENS - prompt.length) {
      if (shouldStop?.()) throw new Error("stopped");
      applyTimestampRules(logits, sampled, cfg);
      const next = argmax(logits);
      if (next === cfg.eot) break;
      sampled.push(next);
      const loop = repetitionAt(sampled);
      if (loop) {
        // Keep one copy of the repeated words and end this window.
        sampled.splice(sampled.length - loop * 3);
        break;
      }
      if (next >= cfg.timestampBegin) {
        const time = (next - cfg.timestampBegin) * TIME_PRECISION;
        // No timestamp beyond the audio of this window.
        if (time > windowSeconds + 0.5) break;
        // Progress inside the window: up to the last timestamp written.
        onProgress?.(Math.min(seek + Math.round(time * SAMPLE_RATE), audio.length), audio.length);
      }
      logits = await decoder.step([next]);
    }
    const offset = seek / SAMPLE_RATE;
    const found = segmentsOf(sampled, cfg, tokenizer, offset);
    segments.push(...found.segments.map((s) => ({ ...s, end: Math.min(s.end, offset + windowSeconds) })));
    const full = window.length === CHUNK_SAMPLES;
    if (!full) {
      // Last window: keep a cut-off segment's words too.
      const tail = tokenizer.decode(found.tail).trim();
      if (tail) segments.push({ start: offset + (found.unfinished ?? found.lastEnd ?? 0), end: offset + windowSeconds, text: tail });
      seek = audio.length;
    } else if (found.unfinished !== null && found.unfinished > 0) {
      // The window cut a segment: start the next window where it began.
      seek += Math.round(found.unfinished * SAMPLE_RATE);
    } else if (found.lastEnd !== null && found.lastEnd > 1) {
      seek += Math.round(found.lastEnd * SAMPLE_RATE);
    } else {
      const tail = tokenizer.decode(found.tail).trim();
      if (tail) segments.push({ start: offset, end: offset + windowSeconds, text: tail });
      seek += CHUNK_SAMPLES;
    }
    onProgress?.(Math.min(seek, audio.length), audio.length);
  }
  return { segments, language: lang ?? "en" };
}
