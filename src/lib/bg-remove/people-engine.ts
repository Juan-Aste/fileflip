import { ConversionError } from "@/lib/convert-error";
import { mediapipeAssets, SELFIE_MODEL_BYTES, SELFIE_MODEL_SHA256 } from "./people-assets";

// MediaPipe Selfie Segmenter (Apache-2.0, used under the owner's exception,
// docs/licencia-agpl.md), shared by the worker (people.worker.ts) and the
// main-thread fallback (people-client.ts). Everything comes from our domain.
// MediaPipe always uploads the image through WebGL, even with the CPU
// delegate: in a worker it needs WebGL on an OffscreenCanvas, on the main
// thread WebGL on a <canvas>.

type Segmenter = import("@mediapipe/tasks-vision").ImageSegmenter;

async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data as Uint8Array<ArrayBuffer>));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Downloads (from our domain), checks and starts the engine and the model. */
export async function loadSegmenter(canvas?: HTMLCanvasElement | OffscreenCanvas): Promise<Segmenter> {
  const [{ FilesetResolver, ImageSegmenter }, response] = await Promise.all([import("@mediapipe/tasks-vision"), fetch(mediapipeAssets.model)]);
  if (!response.ok) throw new ConversionError("serviceUnavailable");
  const model = new Uint8Array(await response.arrayBuffer());
  if (model.byteLength !== SELFIE_MODEL_BYTES || (await sha256Hex(model)) !== SELFIE_MODEL_SHA256) throw new ConversionError("serviceUnavailable");
  // In a worker (run as a classic one by webpack) MediaPipe loads its glue
  // with importScripts, on the main thread with a <script>; either way it
  // picks the SIMD or no-SIMD build itself.
  const fileset = await FilesetResolver.forVisionTasks(self.location.origin + mediapipeAssets.base);
  return ImageSegmenter.createFromOptions(fileset, {
    ...(canvas ? { canvas } : {}),
    baseOptions: { modelAssetBuffer: model, delegate: "CPU" },
    runningMode: "IMAGE",
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });
}

/** Work copy (RGBA) → person probability, 0–255, same size. */
export function segmentWith(segmenter: Segmenter, work: ArrayBuffer, width: number, height: number): Uint8Array {
  const result = segmenter.segment(new ImageData(new Uint8ClampedArray(work), width, height));
  try {
    const masks = result.confidenceMasks ?? [];
    // Selfie Segmenter has one output: the probability of "person".
    const confidence = masks[masks.length - 1]?.getAsFloat32Array();
    if (!confidence || confidence.length !== width * height) throw new Error("Unexpected mask size");
    const prob = new Uint8Array(confidence.length);
    for (let i = 0; i < prob.length; i++) prob[i] = Math.round(Math.min(1, Math.max(0, confidence[i]!)) * 255);
    return prob;
  } finally {
    result.close();
  }
}

/** Where WebGL is available for MediaPipe in this browser. */
export type WebglSupport = "worker" | "main" | "none";

function hasWebgl(canvas: HTMLCanvasElement | OffscreenCanvas): boolean {
  try {
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * "worker" when an OffscreenCanvas has WebGL (checked on the main thread, which
 * matches workers in Chrome, Firefox and Safari), else "main" when a <canvas>
 * has it (older Safari, WebKitGTK), else "none" (WebGL turned off).
 */
export function webglSupport(): WebglSupport {
  if (typeof OffscreenCanvas !== "undefined" && hasWebgl(new OffscreenCanvas(1, 1))) return "worker";
  if (typeof document !== "undefined" && hasWebgl(document.createElement("canvas"))) return "main";
  return "none";
}
