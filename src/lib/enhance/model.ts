// The "Enhance photo" upscaler model (phase 17): Real-ESRGAN
// realesr-general-x4v3 (SRVGGNetCompact, BSD-3-Clause, xinntao/Real-ESRGAN),
// converted to ONNX by scripts/enhance/convert-realesrgan.py from the official
// release file (v0.2.5.0). Served from our own domain (public/models, 4.9 MB),
// downloaded only when the AI mode runs, checked against its size and SHA-256
// and kept in the Cache API. Origin, conversion and checks:
// docs/mejorar-foto-modelo.md. Training data (DIV2K, Flickr2K): exception
// approved by the owner on 2026-11-03, only for this tool.
import type { ModelFile } from "@/lib/tts/model";

export const UPSCALE_MODEL: ModelFile = {
  path: "/models/realesr-general-x4v3.onnx",
  bytes: 4_866_414,
  sha256: "70514693fab82d17286b0b9a4a98470e680d55020d591cedb8208ba35e51ef23",
};

/** sha256 of the official realesr-general-x4v3.pth the ONNX file was made from. */
export const UPSCALE_SOURCE_SHA256 = "8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292";

/** The network enlarges 4×; x2 is the 4× result halved by 2 × 2 averaging. */
export const MODEL_SCALE = 4;

/** One cache per model file: a new version never reads the old one. */
export const UPSCALE_CACHE_NAME = `fileflect-enhance-${UPSCALE_MODEL.sha256.slice(0, 12)}`;

/**
 * Tiles: the image is cut into TILE × TILE squares (smaller with WASM, which
 * gives finer progress and less memory), each run with PAD pixels of the real
 * image around it, and only the center is kept. The network sees each pixel
 * with its neighbors, so the seams match the whole-image result.
 */
export const TILE = { webgpu: 256, wasm: 128 } as const;
export const PAD = 24;
