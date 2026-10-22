/// <reference lib="webworker" />
import type { InferenceSession } from "onnxruntime-web";
import { MODEL_URL } from "@/lib/bg-remove/assets";
import { applyMask, MAX_PIXELS, MODEL_SIDE, modelInput, normalizeMask, type Background } from "@/lib/bg-remove/mask";
import type { FormatId } from "@/config/formats";
import { ConversionError } from "@/lib/convert-error";
import { isDamagedImage } from "@/lib/image/integrity";
import { exposeHandlers } from "@/lib/worker-rpc";

// Background removal: decoding, the model (onnxruntime-web, CPU/WASM, one
// thread: no cross-origin isolation needed) and the mask, off the main thread.
// The runtime and the model are fetched from our domain on first use and the
// session is kept for the next photos of the batch.

let session: Promise<{ ort: typeof import("onnxruntime-web/wasm"); model: InferenceSession }> | null = null;

function loadSession() {
  session ??= (async () => {
    const ort = await import("onnxruntime-web/wasm");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    const response = await fetch(MODEL_URL);
    if (!response.ok) throw new ConversionError("serviceUnavailable");
    const model = await ort.InferenceSession.create(new Uint8Array(await response.arrayBuffer()), { executionProviders: ["wasm"] });
    return { ort, model };
  })();
  // A failed load (offline, blocked) is retried by the next photo.
  session.catch(() => (session = null));
  return session;
}

function pixels(source: ImageBitmap, width: number, height: number): Uint8ClampedArray {
  const ctx = new OffscreenCanvas(width, height).getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No 2D context");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height).data;
}

async function removeBackground(
  { input, from, background }: { input: Blob; from: FormatId; background: Background },
  onProgress: (progress: number) => void,
) {
  // Browsers draw a truncated JPEG or PNG with a grey or empty part instead of failing.
  if (isDamagedImage(new Uint8Array(await input.arrayBuffer()), from)) throw new ConversionError("fileDamaged");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(input, { imageOrientation: "from-image" });
  } catch {
    throw new ConversionError("fileDamaged");
  }
  try {
    const { width, height } = bitmap;
    if (width * height > MAX_PIXELS) throw new ConversionError("fileTooLarge");
    onProgress(0.05);
    const { ort, model } = await loadSession();
    onProgress(0.3);
    const tensor = new ort.Tensor("float32", modelInput(pixels(bitmap, MODEL_SIDE, MODEL_SIDE)), [1, 3, MODEL_SIDE, MODEL_SIDE]);
    const output = await model.run({ [model.inputNames[0]!]: tensor });
    const mask = normalizeMask(output[model.outputNames[0]!]!.data as Float32Array);
    for (const t of Object.values(output)) t.dispose();
    tensor.dispose();
    onProgress(0.8);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, width, height);
    applyMask(image.data, width, height, mask, background);
    ctx.putImageData(image, 0, 0);
    const type = background.kind === "transparent" ? "image/png" : "image/jpeg";
    const blob = await canvas.convertToBlob({ type, quality: 0.92 });
    onProgress(1);
    const buffer = await blob.arrayBuffer();
    return { result: { buffer, width, height }, transfer: [buffer] };
  } finally {
    bitmap.close();
  }
}

exposeHandlers({ removeBackground });
