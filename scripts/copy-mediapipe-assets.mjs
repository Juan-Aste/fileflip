// Copies the MediaPipe Tasks Vision WASM engine (@mediapipe/tasks-vision,
// Apache-2.0; ES-module SIMD build, single-threaded) from node_modules into
// public/mediapipe so it is served from our own domain, and checks the
// Selfie Segmenter model kept in public/models. Runs before `next build` and
// `next dev` (npm pre-scripts); public/mediapipe is not committed.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = readFileSync(join(root, "src/lib/bg-remove/people-assets.ts"), "utf8");
const constant = (name) => new RegExp(`${name} = "([^"]+)"`).exec(assets)[1];
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const fail = (message) => {
  console.error(`copy-mediapipe-assets: ${message}`);
  process.exit(1);
};

const version = constant("MEDIAPIPE_VERSION");
const pkg = join(root, "node_modules/@mediapipe/tasks-vision");
const installed = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")).version;
if (installed !== version) fail(`@mediapipe/tasks-vision ${installed} is installed but people-assets.ts says ${version}`);
const out = join(root, "public/mediapipe", `tasks-vision-${version}`);
mkdirSync(out, { recursive: true });
for (const [file, hash] of [["vision_wasm_module_internal.js", "MEDIAPIPE_JS_SHA256"], ["vision_wasm_module_internal.wasm", "MEDIAPIPE_WASM_SHA256"]]) {
  const from = join(pkg, "wasm", file);
  const actual = sha256(from);
  if (actual !== constant(hash)) fail(`${file} has sha256 ${actual}, expected ${constant(hash)}`);
  copyFileSync(from, join(out, file));
}
const model = join(root, "public/models/selfie_segmenter-float16-v1.tflite");
if (sha256(model) !== constant("SELFIE_MODEL_SHA256")) fail(`${model} does not match SELFIE_MODEL_SHA256`);
console.log("copy-mediapipe-assets: public/mediapipe ready, model checked");
