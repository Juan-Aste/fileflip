// Where the "people" mode gets MediaPipe from: our own domain only (phase 15).
// - The Tasks Vision WASM engine (@mediapipe/tasks-vision, Apache-2.0):
//   scripts/copy-mediapipe-assets.mjs copies the ES-module build (SIMD,
//   single-threaded: no SharedArrayBuffer) from node_modules into
//   public/mediapipe before each build, checking the version and hashes below.
// - The Selfie Segmenter model ("square", float16, version 1; Apache-2.0,
//   used under the owner's written exception of 2026-11-02, see
//   docs/licencia-agpl.md): kept in the repo under public/models (250 KB),
//   checked by the same script at build time and by the worker after download.
export const MEDIAPIPE_VERSION = "1.1.1";
/** sha256 of the two engine files copied (wasm/ of @mediapipe/tasks-vision 1.1.1). */
export const MEDIAPIPE_JS_SHA256 = "539a4386fd12d0723d6e900ec80467d168ba7290dda2f79e77a2181b8e906115";
export const MEDIAPIPE_WASM_SHA256 = "3b57e4b55ac6346bf940212e3e11250b308a6a474077385e2f527b119cf74525";
/** Official file: storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite */
export const SELFIE_MODEL_SHA256 = "191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b";
export const SELFIE_MODEL_BYTES = 249_537;
/** Engine download (uncompressed WASM; ~3.9 MB over the wire with gzip, ~2.8 MB with Brotli). */
export const MEDIAPIPE_WASM_BYTES = 13_519_940;

const base = `/mediapipe/tasks-vision-${MEDIAPIPE_VERSION}`;
export const mediapipeAssets = {
  loader: `${base}/vision_wasm_module_internal.js`,
  wasm: `${base}/vision_wasm_module_internal.wasm`,
  model: "/models/selfie_segmenter-float16-v1.tflite",
};
