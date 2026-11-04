/// <reference lib="webworker" />
import type { FormatId } from "@/config/formats";
import { ConversionError } from "@/lib/convert-error";
import type { InferenceSession } from "onnxruntime-web";
import { autoEnhance, type AutoEnhanceReport } from "@/lib/enhance/auto";
import { TILE, UPSCALE_CACHE_NAME, UPSCALE_MODEL } from "@/lib/enhance/model";
import type { TileRunner } from "@/lib/enhance/tiles";
import { upscaleImage, type UpscaleFactor } from "@/lib/enhance/upscale";
import { fetchModelFile, openModelStore } from "@/lib/tts/model-cache";
import { ENHANCE_QUALITY, enhanceOutputFormat, megapixels, type EnhanceOutput } from "@/lib/enhance/output";
import { encoders } from "@/lib/image/codecs";
import { decodeImage } from "@/lib/image/decode";
import { isDamagedImage } from "@/lib/image/integrity";
import { hasTransparency, type RawImage } from "@/lib/image/pixels";
import { exposeHandlers } from "@/lib/worker-rpc";

// "Enhance photo" off the main thread. Runs on its own job pool
// (src/lib/enhance/client.ts): cancelling terminates the worker.

async function decode(input: Blob, from: FormatId, maxMegapixels: number): Promise<RawImage> {
  const buffer = await input.arrayBuffer();
  if (isDamagedImage(new Uint8Array(buffer), from)) throw new ConversionError("fileDamaged");
  let image: RawImage;
  try {
    image = await decodeImage(buffer, from);
  } catch {
    throw new ConversionError("fileDamaged");
  }
  if (megapixels(image.width, image.height) > maxMegapixels) throw new ConversionError("imageTooLarge");
  return image;
}

async function encode(image: RawImage, from: FormatId) {
  const format = enhanceOutputFormat(from, hasTransparency(image));
  const buffer = await encoders[format]!(image, { quality: ENHANCE_QUALITY });
  return { buffer, format };
}

export interface EnhanceArgs {
  input: Blob;
  from: FormatId;
  /** Checked after decoding (the UI checks it first from the preview). */
  maxMegapixels: number;
}

export interface AutoResult {
  buffer: ArrayBuffer;
  format: EnhanceOutput;
  width: number;
  height: number;
  report: AutoEnhanceReport;
}

async function auto({ input, from, maxMegapixels }: EnhanceArgs, onProgress: (progress: number) => void) {
  const image = await decode(input, from, maxMegapixels);
  onProgress(0.2);
  const { image: out, report } = autoEnhance(image);
  onProgress(0.75);
  const { buffer, format } = await encode(out, from);
  onProgress(1);
  const result: AutoResult = { buffer, format, width: out.width, height: out.height, report };
  return { result, transfer: [buffer] };
}

// ---- AI mode: Real-ESRGAN with onnxruntime-web ----
// WebGPU when the browser has an adapter, else WASM on one thread (no
// cross-origin isolation: it would break AdSense). The model file comes from
// our domain, checked by size and SHA-256 and kept in the Cache API; the
// session stays loaded for the next photo while the worker lives.

export type UpscaleBackend = "webgpu" | "wasm";

interface Engine {
  backend: UpscaleBackend;
  tile: number;
  run: TileRunner;
}

let modelBytes: Promise<Uint8Array> | null = null;
const engines = new Map<UpscaleBackend, Promise<Engine>>();

function model(onBytes: (received: number) => void) {
  if (!modelBytes) {
    modelBytes = (async () => {
      const store = await openModelStore(UPSCALE_CACHE_NAME);
      return fetchModelFile(UPSCALE_MODEL, { store, onBytes, url: new URL(UPSCALE_MODEL.path, self.location.origin).href });
    })();
    // Offline or blocked: try again on the next run.
    modelBytes.catch(() => (modelBytes = null));
  }
  return modelBytes;
}

async function hasWebGpu() {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    return !!gpu && !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

type Ort = typeof import("onnxruntime-web/wasm");

const runner =
  (ort: Ort, session: InferenceSession): TileRunner =>
  async (input, width, height) => {
    const feeds = { [session.inputNames[0]!]: new ort.Tensor("float32", input, [1, 3, height, width]) };
    const out = await session.run(feeds);
    const tensor = out[session.outputNames[0]!]!;
    const data = (await tensor.getData()) as Float32Array;
    tensor.dispose();
    return data;
  };

function engine(backend: UpscaleBackend, bytes: Uint8Array) {
  let e = engines.get(backend);
  if (!e) {
    e = (async (): Promise<Engine> => {
      if (backend === "webgpu") {
        const ort = (await import("onnxruntime-web/webgpu")) as unknown as Ort;
        const session = await ort.InferenceSession.create(bytes, { executionProviders: ["webgpu"] });
        return { backend, tile: TILE.webgpu, run: runner(ort, session) };
      }
      const ort = await import("onnxruntime-web/wasm");
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      return { backend, tile: TILE.wasm, run: runner(ort, session) };
    })();
    engines.set(backend, e);
    e.catch(() => engines.delete(backend));
  }
  return e;
}

export interface UpscaleArgs extends EnhanceArgs {
  factor: UpscaleFactor;
  /** "wasm" skips WebGPU (tests, or after a WebGPU failure). */
  backend?: "auto" | "wasm";
}

export interface UpscaleResult {
  buffer: ArrayBuffer;
  format: EnhanceOutput;
  width: number;
  height: number;
  backend: UpscaleBackend;
  /** Time spent in the network, in milliseconds. */
  inferenceMs: number;
}

/** Progress: model download 0–10 %, tiles 10–92 %, encoding the rest. */
async function upscale({ input, from, maxMegapixels, factor, backend = "auto" }: UpscaleArgs, onProgress: (progress: number) => void) {
  if (factor !== 2 && factor !== 4) throw new ConversionError("invalidRequest");
  const image = await decode(input, from, maxMegapixels);
  const bytes = await model((received) => onProgress(0.1 * (received / UPSCALE_MODEL.bytes)));
  onProgress(0.1);
  const started = performance.now();
  const go = async (e: Engine) => upscaleImage(image, factor, e.run, { tile: e.tile, onProgress: (f) => onProgress(0.1 + 0.82 * f) });
  let used: Engine | null = null;
  let out: RawImage | null = null;
  if (backend === "auto" && (await hasWebGpu())) {
    try {
      used = await engine("webgpu", bytes);
      out = await go(used);
    } catch {
      // No usable WebGPU after all (driver, memory, unsupported operator): WASM below.
      engines.delete("webgpu");
      used = null;
    }
  }
  if (!out) {
    used = await engine("wasm", bytes);
    out = await go(used);
  }
  const inferenceMs = Math.round(performance.now() - started);
  const { buffer, format } = await encode(out, from);
  onProgress(1);
  const result: UpscaleResult = { buffer, format, width: out.width, height: out.height, backend: used!.backend, inferenceMs };
  return { result, transfer: [buffer] };
}

exposeHandlers({ auto, upscale });
