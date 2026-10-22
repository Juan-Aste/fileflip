// Where the background removal model is served from: our own domain, never a CDN.
// The onnxruntime-web WASM runtime is emitted by the bundler next to the worker.
/** U²-Net small (u2netp), Apache-2.0; sha256 309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8. */
export const MODEL_URL = "/bg/u2netp.onnx";
/** What the first use downloads (runtime ~14 MB, ~3.5 MB compressed, and the 4.6 MB model), shown to the user. */
export const DOWNLOAD_MB = 19;
