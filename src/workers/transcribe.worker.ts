/// <reference lib="webworker" />
import { fetchModelSources, openModelStore } from "@/lib/tts/model-cache";
import type { ModelFile } from "@/lib/tts/model";
import { whisperCacheName, whisperModels, whisperSources, type WhisperModelId } from "@/lib/transcribe/model";
import {
  parseGenerationConfig,
  parseTokenizer,
  transcribe,
  type GenerationConfig,
  type Segment,
  type WhisperSessions,
  type WhisperTokenizer,
} from "@/lib/transcribe/whisper";
import { exposeHandlers } from "@/lib/worker-rpc";

// Whisper off the main thread: the model files are downloaded (or read from
// the Cache API) and verified once per worker, the two ONNX sessions stay
// loaded for the next file. onnxruntime-web on CPU/WASM with one thread, as
// the AI voice: no cross-origin isolation needed. Cancelling terminates the
// worker (the job pool does it); the next run reads the model from the cache.
// Files come from our storage when the page passes its URL (`base`), else
// from Hugging Face.

type Ort = typeof import("onnxruntime-web/wasm");

interface Loaded {
  ort: Ort;
  sessions: WhisperSessions;
  cfg: GenerationConfig;
  tokenizer: WhisperTokenizer;
}

const loaded = new Map<WhisperModelId, Promise<Loaded>>();
/** Our model storage (src/lib/models/sources.ts), set by `prepare`; "" = Hugging Face only. */
let base = "";

const decodeJson = (data: Uint8Array) => JSON.parse(new TextDecoder().decode(data)) as unknown;

function load(id: WhisperModelId, onBytes: (file: ModelFile, received: number) => void) {
  let model = loaded.get(id);
  if (!model) {
    model = (async () => {
      const spec = whisperModels[id];
      const ort = await import("onnxruntime-web/wasm");
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      const store = await openModelStore(whisperCacheName(spec));
      const get = (path: string) => {
        const file = spec.files.find((f) => f.path === path)!;
        return fetchModelSources(whisperSources(spec, file, base), { store, onBytes });
      };
      // The small files Whisper does not read here are still fetched: they are part of the pinned set.
      await Promise.all([get("config.json"), get("preprocessor_config.json")]);
      const cfg = parseGenerationConfig(decodeJson(await get("generation_config.json")));
      const tokenizer = parseTokenizer(decodeJson(await get("tokenizer.json")));
      const session = async (name: string) =>
        ort.InferenceSession.create(await get(`onnx/${name}.onnx`), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      const sessions: WhisperSessions = { encoder: await session("encoder_model_quantized"), decoder: await session("decoder_model_merged_quantized") };
      return { ort, sessions, cfg, tokenizer };
    })();
    loaded.set(id, model);
    // A failed load (offline, blocked, out of memory) is retried on the next request.
    model.catch(() => loaded.delete(id));
  }
  return model;
}

/** Downloads (or reads from the cache) one model; progress is by bytes. */
async function prepare({ model: id, base: from = "" }: { model: WhisperModelId; base?: string }, onProgress: (progress: number) => void) {
  base = from;
  const files = whisperModels[id].files;
  const total = files.reduce((sum, f) => sum + f.bytes, 0);
  const received = new Map<string, number>();
  await load(id, (file, n) => {
    received.set(file.path, n);
    let sum = 0;
    for (const v of received.values()) sum += v;
    // The last few percent are the sessions being created.
    onProgress(Math.min(0.97, (sum / total) * 0.97));
  });
  onProgress(1);
  return { result: null };
}

export interface TranscribeArgs {
  model: WhisperModelId;
  /** 16 kHz mono float samples (transferred). */
  audio: ArrayBuffer;
  language?: string;
}

/** Segments with times, and the language used (detected when not given); progress by audio position. */
async function run({ model: id, audio, language }: TranscribeArgs, onProgress: (progress: number) => void) {
  const m = await load(id, () => {});
  const result: { segments: Segment[]; language: string } = await transcribe(m.ort, m.sessions, m.cfg, m.tokenizer, new Float32Array(audio), {
    language,
    onProgress: (done, total) => onProgress(total > 0 ? done / total : 1),
  });
  return { result };
}

exposeHandlers({ prepare, transcribe: run });
