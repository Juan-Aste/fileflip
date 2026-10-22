// Copies the OCR engine (tesseract.js worker, WASM core and language models)
// from node_modules into public/ocr so it is served from our own domain.
// Runs before `next build` and `next dev` (npm pre-scripts); public/ocr is not committed.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = readFileSync(join(root, "src/lib/ocr/assets.ts"), "utf8");
const constant = (name) => new RegExp(`${name} = "([^"]+)"`).exec(assets)[1];
const installed = (pkg) => JSON.parse(readFileSync(join(root, "node_modules", pkg, "package.json"), "utf8")).version;

for (const [pkg, name] of [["tesseract.js", "TESSERACT_VERSION"], ["tesseract.js-core", "TESSERACT_CORE_VERSION"]]) {
  if (installed(pkg) !== constant(name)) {
    console.error(`copy-ocr-assets: ${pkg} ${installed(pkg)} is installed but src/lib/ocr/assets.ts says ${constant(name)}`);
    process.exit(1);
  }
}

const copy = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
};
const out = join(root, "public/ocr");
copy(join(root, "node_modules/tesseract.js/dist/worker.min.js"), join(out, `tesseract.js-${constant("TESSERACT_VERSION")}/worker.min.js`));
// Only the LSTM builds (the engine mode we use); the worker picks one by WASM SIMD support.
for (const core of ["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"]) {
  copy(join(root, "node_modules/tesseract.js-core", core), join(out, `tesseract.js-core-${constant("TESSERACT_CORE_VERSION")}`, core));
}
const variant = constant("TESSDATA_VARIANT");
for (const lang of ["eng", "spa", "por", "fra", "chi_sim"]) {
  const from = join(root, "node_modules/@tesseract.js-data", lang, variant, `${lang}.traineddata.gz`);
  if (!existsSync(from)) {
    console.error(`copy-ocr-assets: missing ${from}`);
    process.exit(1);
  }
  copy(from, join(out, `tessdata-${variant}`, `${lang}.traineddata.gz`));
}
console.log("copy-ocr-assets: public/ocr ready");
