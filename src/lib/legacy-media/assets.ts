// Where the FFmpeg WASM build (@ffmpeg/core, single-threaded: no SharedArrayBuffer,
// so no cross-origin isolation, which AdSense rules out) is served from: our own
// domain. scripts/copy-ffmpeg-assets.mjs copies it from node_modules into
// public/ffmpeg before each build and checks the version and hashes below.
export const FFMPEG_CORE_VERSION = "0.12.10";
/** sha256 of the two files copied (dist/esm of @ffmpeg/core 0.12.10). */
export const FFMPEG_CORE_JS_SHA256 = "67a48f11645f85439f3fde4f2119042c16b374b910206b7a7a24f342e28dcae3";
export const FFMPEG_CORE_WASM_SHA256 = "9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7";
/** Download size shown to the user (the WASM file). */
export const FFMPEG_CORE_BYTES = 32_232_419;

const base = `/ffmpeg/core-${FFMPEG_CORE_VERSION}`;
export const ffmpegAssets = { js: `${base}/ffmpeg-core.js`, wasm: `${base}/ffmpeg-core.wasm` };
