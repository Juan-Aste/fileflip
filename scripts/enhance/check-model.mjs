// Checks the "Enhance photo" model kept in public/models against the size and
// SHA-256 pinned in src/lib/enhance/model.ts. Runs before `next build` and
// `next dev` (npm pre-scripts), so a damaged or replaced file never ships.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(join(root, "src/lib/enhance/model.ts"), "utf8");
const path = /path: "([^"]+)"/.exec(source)[1];
const bytes = Number(/bytes: ([\d_]+)/.exec(source)[1].replaceAll("_", ""));
const sha256 = /sha256: "([0-9a-f]{64})"/.exec(source)[1];
const data = readFileSync(join(root, "public", path));
const actual = createHash("sha256").update(data).digest("hex");
if (data.byteLength !== bytes || actual !== sha256) {
  console.error(`check-enhance-model: public${path} is ${data.byteLength} bytes with sha256 ${actual}, expected ${bytes} and ${sha256}`);
  process.exit(1);
}
console.log("check-enhance-model: Real-ESRGAN model checked");
