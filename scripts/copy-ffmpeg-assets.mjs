// Copies the single-threaded FFmpeg WASM build (@ffmpeg/core, GPL-2.0-or-later)
// from node_modules into public/ffmpeg so it is served from our own domain.
// Runs before `next build` and `next dev` (npm pre-scripts); public/ffmpeg is not committed.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = readFileSync(join(root, "src/lib/legacy-media/assets.ts"), "utf8");
const constant = (name) => new RegExp(`${name} = "([^"]+)"`).exec(assets)[1];
const version = constant("FFMPEG_CORE_VERSION");
const pkg = join(root, "node_modules/@ffmpeg/core");
const installed = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")).version;
if (installed !== version) {
  console.error(`copy-ffmpeg-assets: @ffmpeg/core ${installed} is installed but src/lib/legacy-media/assets.ts says ${version}`);
  process.exit(1);
}
const out = join(root, "public/ffmpeg", `core-${version}`);
mkdirSync(out, { recursive: true });
for (const [file, hash] of [["ffmpeg-core.js", "FFMPEG_CORE_JS_SHA256"], ["ffmpeg-core.wasm", "FFMPEG_CORE_WASM_SHA256"]]) {
  const from = join(pkg, "dist/esm", file);
  const actual = createHash("sha256").update(readFileSync(from)).digest("hex");
  if (actual !== constant(hash)) {
    console.error(`copy-ffmpeg-assets: ${file} has sha256 ${actual}, expected ${constant(hash)}`);
    process.exit(1);
  }
  copyFileSync(from, join(out, file));
}
console.log("copy-ffmpeg-assets: public/ffmpeg ready");
