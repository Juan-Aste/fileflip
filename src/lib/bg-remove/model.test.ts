// Runs the real model (the same ONNX file and onnxruntime-web build the page uses)
// on synthetic photos and checks the mask, not just that something came out.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as ort from "onnxruntime-web";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { applyMask, MODEL_SIDE, modelInput, normalizeMask } from "./mask";

const root = join(__dirname, "../../..");
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = join(root, "node_modules/onnxruntime-web/dist/");

let session: Promise<ort.InferenceSession> | undefined;

async function maskOf(png: Buffer): Promise<Uint8Array> {
  const model = await (session ??= ort.InferenceSession.create(readFileSync(join(root, "public/bg/u2netp.onnx"))));
  const { data } = await sharp(png).resize(MODEL_SIDE, MODEL_SIDE, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const input = new ort.Tensor("float32", modelInput(new Uint8Array(data)), [1, 3, MODEL_SIDE, MODEL_SIDE]);
  const out = await model.run({ [model.inputNames[0]!]: input });
  return normalizeMask(out[model.outputNames[0]!]!.data as Float32Array);
}

const disc = (w: number, h: number) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="g" cx="40%" cy="35%"><stop offset="0" stop-color="#ff6060"/><stop offset="1" stop-color="#a00000"/></radialGradient></defs>` +
        `<rect width="100%" height="100%" fill="#d8d4cc"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) * 0.28}" fill="url(#g)"/></svg>`,
    ),
  )
    .png()
    .toBuffer();

describe("u2netp", () => {
  it("separates a shaded ball from a plain background", async () => {
    const mask = await maskOf(await disc(640, 480));
    const at = (x: number, y: number) => mask[Math.round(y * (MODEL_SIDE - 1)) * MODEL_SIDE + Math.round(x * (MODEL_SIDE - 1))]!;
    expect(at(0.5, 0.5)).toBeGreaterThan(220);
    for (const [x, y] of [[0.02, 0.02], [0.98, 0.02], [0.02, 0.98], [0.98, 0.98], [0.1, 0.5], [0.9, 0.5]] as const) expect(at(x, y)).toBeLessThan(30);
    // The edge follows the circle: inside its radius high, a bit outside low.
    expect(at(0.5 + 0.28 * 0.75 * 0.85, 0.5)).toBeGreaterThan(150);
    expect(at(0.5 + 0.28 * 0.75 * 1.2, 0.5)).toBeLessThan(60);
  }, 60_000);

  it("the full-size result is transparent around the subject", async () => {
    const png = await disc(800, 600);
    const mask = await maskOf(png);
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const rgba = new Uint8ClampedArray(data);
    applyMask(rgba, info.width, info.height, mask, { kind: "transparent" });
    const alpha = (x: number, y: number) => rgba[(y * info.width + x) * 4 + 3]!;
    expect(alpha(400, 300)).toBe(255);
    expect(alpha(5, 5)).toBe(0);
    expect(alpha(795, 595)).toBe(0);
  }, 60_000);
});
