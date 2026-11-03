/// <reference lib="webworker" />
import type { InferenceSession } from "onnxruntime-web";
import { fetchModelSources, openModelStore } from "@/lib/tts/model-cache";
import { supertonicFiles, supertonicSources, supertonicVoiceFiles, type ModelFile, type SupertonicVoice } from "@/lib/tts/model";
import {
  parseConfig,
  parseIndexer,
  parseVoiceStyle,
  synthesize,
  type SupertonicConfig,
  type SupertonicLanguage,
  type SupertonicSessions,
  type VoiceStyle,
} from "@/lib/tts/supertonic";
import { exposeHandlers } from "@/lib/worker-rpc";

// The AI voice (Supertonic 3) off the main thread: the model files are
// downloaded (or read from the Cache API) and verified once, the four ONNX
// sessions stay loaded for the following sentences. onnxruntime-web on
// CPU/WASM with one thread: no cross-origin isolation needed. Files come from
// our storage when the page passes its URL (`base`), else from Hugging Face.

type Ort = typeof import("onnxruntime-web/wasm");

interface Model {
  ort: Ort;
  sessions: SupertonicSessions;
  cfg: SupertonicConfig;
  indexer: Int32Array;
}

let model: Promise<Model> | null = null;
/** Our model storage (src/lib/models/sources.ts), set by `prepare`; "" = Hugging Face only. */
let base = "";
const voices = new Map<SupertonicVoice, Promise<VoiceStyle>>();

const decodeJson = (data: Uint8Array) => JSON.parse(new TextDecoder().decode(data)) as unknown;

function loadModel(onBytes: (file: ModelFile, received: number) => void) {
  model ??= (async () => {
    const ort = await import("onnxruntime-web/wasm");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const store = await openModelStore();
    const get = (path: string) => {
      const file = supertonicFiles.find((f) => f.path === path)!;
      return fetchModelSources(supertonicSources(file, base), { store, onBytes });
    };
    const cfg = parseConfig(decodeJson(await get("onnx/tts.json")));
    const indexer = parseIndexer(decodeJson(await get("onnx/unicode_indexer.json")));
    // One model at a time, so its downloaded copy can be freed before the next.
    const session = async (name: string): Promise<InferenceSession> =>
      ort.InferenceSession.create(await get(`onnx/${name}.onnx`), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    const sessions: SupertonicSessions = {
      durationPredictor: await session("duration_predictor"),
      textEncoder: await session("text_encoder"),
      vectorEstimator: await session("vector_estimator"),
      vocoder: await session("vocoder"),
    };
    return { ort, sessions, cfg, indexer };
  })();
  // A failed load (offline, blocked, out of memory) is retried on the next request.
  model.catch(() => (model = null));
  return model;
}

function loadVoice(voice: SupertonicVoice, onBytes: (file: ModelFile, received: number) => void) {
  let style = voices.get(voice);
  if (!style) {
    const file = supertonicVoiceFiles[voice];
    style = openModelStore()
      .then((store) => fetchModelSources(supertonicSources(file, base), { store, onBytes }))
      .then((data) => parseVoiceStyle(decodeJson(data)));
    voices.set(voice, style);
    style.catch(() => voices.delete(voice));
  }
  return style;
}

/** Downloads (or reads from the cache) the model and one voice; progress is by bytes. */
async function prepare({ voice, base: from = "" }: { voice: SupertonicVoice; base?: string }, onProgress: (progress: number) => void) {
  base = from;
  // Expected and received bytes per file; a source that fails hands over to
  // the next one, whose size may differ (the float16 copy vs the original).
  const expected = new Map([...supertonicFiles, supertonicVoiceFiles[voice]].map((f) => [f.path, supertonicSources(f, base)[0].file.bytes]));
  const received = new Map<string, number>();
  const onBytes = (file: ModelFile, n: number) => {
    expected.set(file.path, file.bytes);
    received.set(file.path, n);
    let sum = 0;
    let total = 0;
    for (const v of received.values()) sum += v;
    for (const v of expected.values()) total += v;
    // The last few percent are the sessions being created.
    onProgress(Math.min(0.97, (sum / total) * 0.97));
  };
  const [{ cfg }] = await Promise.all([loadModel(onBytes), loadVoice(voice, onBytes)]);
  onProgress(1);
  return { result: { sampleRate: cfg.sampleRate } };
}

export interface SpeakArgs {
  text: string;
  lang: SupertonicLanguage;
  voice: SupertonicVoice;
  speed: number;
  steps?: number;
  seed?: number;
  /** Model storage, as in `prepare`: a second worker gets its first request without one. */
  base?: string;
}

/** One sentence as mono 32-bit float PCM (transferred). */
async function speak({ text, lang, voice, speed, steps, seed, base: from }: SpeakArgs, onProgress: (progress: number) => void) {
  if (from !== undefined) base = from;
  const noop = () => {};
  const [m, style] = await Promise.all([loadModel(noop), loadVoice(voice, noop)]);
  const pcm = await synthesize(m.ort, m.sessions, m.cfg, m.indexer, text, { lang, voice: style, speed, steps, seed, onStep: onProgress });
  return { result: { pcm: pcm.buffer, sampleRate: m.cfg.sampleRate }, transfer: [pcm.buffer] };
}

exposeHandlers({ prepare, speak });
