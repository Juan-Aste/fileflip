/// <reference lib="webworker" />
import { mediapipeAssets, SELFIE_MODEL_BYTES, SELFIE_MODEL_SHA256 } from "@/lib/bg-remove/people-assets";
import { ConversionError } from "@/lib/convert-error";
import { exposeHandlers } from "@/lib/worker-rpc";

// "People" mode of background removal: MediaPipe Selfie Segmenter (Apache-2.0,
// used under the owner's exception, docs/licencia-agpl.md) on the reduced copy
// of the photo. Only started when the user picks that mode, so the engine
// (~4 MB) is never downloaded otherwise. Everything comes from our domain;
// the photo never leaves the device.

type Segmenter = import("@mediapipe/tasks-vision").ImageSegmenter;

// The Tasks loader runs `import(url)` for its WASM glue when `importScripts`
// is missing (module workers). Webpack would rewrite that import, so give it
// the browser's own through the hook the loader checks first.
(self as unknown as { import: (url: string) => Promise<unknown> }).import = (url) => import(/* webpackIgnore: true */ url);

let segmenter: Promise<Segmenter> | null = null;

async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data as Uint8Array<ArrayBuffer>));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function load(): Promise<Segmenter> {
  const [{ ImageSegmenter }, response] = await Promise.all([import("@mediapipe/tasks-vision"), fetch(mediapipeAssets.model)]);
  if (!response.ok) throw new ConversionError("serviceUnavailable");
  const model = new Uint8Array(await response.arrayBuffer());
  if (model.byteLength !== SELFIE_MODEL_BYTES || (await sha256Hex(model)) !== SELFIE_MODEL_SHA256) throw new ConversionError("serviceUnavailable");
  const origin = self.location.origin;
  return ImageSegmenter.createFromOptions(
    { wasmLoaderPath: origin + mediapipeAssets.loader, wasmBinaryPath: origin + mediapipeAssets.wasm },
    {
      baseOptions: { modelAssetBuffer: model, delegate: "CPU" },
      runningMode: "IMAGE",
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    },
  );
}

/** Downloads and starts the engine and the model (once per worker). */
async function prepare() {
  if (!segmenter) {
    segmenter = load();
    // A failed start (offline, say) can be retried on the next call.
    segmenter.catch(() => (segmenter = null));
  }
  await segmenter;
  return { result: null };
}

/** Work copy (RGBA) → person probability, 0–255, same size. */
async function segment({ work, workWidth, workHeight }: { work: ArrayBuffer; workWidth: number; workHeight: number }) {
  await prepare();
  const result = (await segmenter!).segment(new ImageData(new Uint8ClampedArray(work), workWidth, workHeight));
  try {
    const masks = result.confidenceMasks ?? [];
    // Selfie Segmenter has one output: the probability of "person".
    const confidence = masks[masks.length - 1]?.getAsFloat32Array();
    if (!confidence || confidence.length !== workWidth * workHeight) throw new Error("Unexpected mask size");
    const prob = new Uint8Array(confidence.length);
    for (let i = 0; i < prob.length; i++) prob[i] = Math.round(Math.min(1, Math.max(0, confidence[i]!)) * 255);
    return { result: { prob: prob.buffer }, transfer: [prob.buffer as ArrayBuffer] };
  } finally {
    result.close();
  }
}

exposeHandlers({ prepare, segment });
