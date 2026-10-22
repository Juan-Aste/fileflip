// Where the OCR engine's files are served from: our own domain (never a CDN).
// scripts/copy-ocr-assets.mjs copies them from node_modules into public/ocr
// before each build, and checks these versions match the installed packages.
export const TESSERACT_VERSION = "7.0.0";
export const TESSERACT_CORE_VERSION = "7.0.0";
/** tessdata_best models quantized to integers (the ones tesseract.js uses by default). */
export const TESSDATA_VARIANT = "4.0.0_best_int";

export const ocrAssets = {
  worker: `/ocr/tesseract.js-${TESSERACT_VERSION}/worker.min.js`,
  core: `/ocr/tesseract.js-core-${TESSERACT_CORE_VERSION}`,
  lang: `/ocr/tessdata-${TESSDATA_VARIANT}`,
};
