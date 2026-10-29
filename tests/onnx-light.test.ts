import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lighten, toHalf } from "../scripts/models/onnx-light.mjs";
import { supertonicFiles, supertonicLightFiles } from "@/lib/tts/model";

// scripts/models/onnx-light.mjs: lighter ONNX copies (task 11.3).
const light = lighten as (model: Buffer, variant: string) => Buffer;
const half = toHalf;

// A tiny ONNX model written by hand: Y = X · W + B, W 64×32 (large enough to be
// converted), B 32 values (small: stays float32).
function varint(n: number) {
  const out = [];
  do {
    let b = n & 0x7f;
    n = Math.floor(n / 128);
    if (n) b |= 0x80;
    out.push(b);
  } while (n);
  return Buffer.from(out);
}
const v = (field: number, n: number) => Buffer.concat([varint(field << 3), varint(n)]);
const b = (field: number, bytes: Buffer | string) => {
  const data = typeof bytes === "string" ? Buffer.from(bytes) : bytes;
  return Buffer.concat([varint((field << 3) | 2), varint(data.length), data]);
};
const floatTensor = (name: string, dims: number[], values: Float32Array) =>
  Buffer.concat([...dims.map((d) => v(1, d)), v(2, 1), b(8, name), b(9, Buffer.from(values.buffer))]);
const valueInfo = (name: string, dims: number[]) =>
  Buffer.concat([b(1, name), b(2, b(1, Buffer.concat([v(1, 1), b(2, Buffer.concat(dims.map((d) => b(1, v(1, d)))))])))]);
const node = (op: string, inputs: string[], outputs: string[]) => Buffer.concat([...inputs.map((s) => b(1, s)), ...outputs.map((s) => b(2, s)), b(4, op)]);

const W = Float32Array.from({ length: 64 * 32 }, (_, i) => Math.sin(i * 0.37) * (1 + (i % 32) / 8));
const B = Float32Array.from({ length: 32 }, (_, i) => i / 100);
const X = Float32Array.from({ length: 64 }, (_, i) => Math.cos(i * 0.21));
const graph = Buffer.concat([
  b(1, node("MatMul", ["X", "W"], ["XW"])),
  b(1, node("Add", ["XW", "B"], ["Y"])),
  b(2, "tiny"),
  b(5, floatTensor("W", [64, 32], W)),
  b(5, floatTensor("B", [32], B)),
  b(11, valueInfo("X", [1, 64])),
  b(12, valueInfo("Y", [1, 32])),
]);
const model = Buffer.concat([v(1, 8), b(8, v(2, 11)), b(7, graph)]);

async function run(bytes: Buffer) {
  const ort = await import("onnxruntime-web");
  ort.env.wasm.numThreads = 1;
  const session = await ort.InferenceSession.create(new Uint8Array(bytes));
  const out = await session.run({ X: new ort.Tensor("float32", X, [1, 64]) });
  return out.Y.data as Float32Array;
}

const maxDiff = (a: Float32Array, c: Float32Array) => a.reduce((m, x, i) => Math.max(m, Math.abs(x - c[i])), 0);

describe("onnx-light", () => {
  it("rounds float32 to float16 bits like IEEE 754 (nearest even)", () => {
    expect(half(0)).toBe(0x0000);
    expect(half(-0)).toBe(0x8000);
    expect(half(1)).toBe(0x3c00);
    expect(half(-2)).toBe(0xc000);
    expect(half(0.5)).toBe(0x3800);
    expect(half(65504)).toBe(0x7bff);
    expect(half(1e6)).toBe(0x7c00); // overflow → infinity
    expect(half(Infinity)).toBe(0x7c00);
    expect(half(NaN) & 0x7c00).toBe(0x7c00);
    expect(half(2 ** -24)).toBe(0x0001); // smallest subnormal
    expect(half(2 ** -26)).toBe(0x0000);
    expect(half(1 + 2 ** -11)).toBe(0x3c00); // halfway: ties to even
    expect(half(1 + 3 * 2 ** -11)).toBe(0x3c02);
    expect(half(0.1)).toBe(0x2e66);
  });

  it("fp16w halves the weights and keeps the result", async () => {
    const out = light(model, "fp16w");
    expect(out.length).toBeLessThan(model.length * 0.55);
    expect(maxDiff(await run(model), await run(out))).toBeLessThan(0.02);
    // Same input, same bytes (pinned SHA-256s depend on it).
    expect(light(model, "fp16w").equals(out)).toBe(true);
  });

  it("int8w quarters the weights and keeps the result close", async () => {
    const out = light(model, "int8w");
    expect(out.length).toBeLessThan(model.length * 0.32); // plus one scale per channel
    const ref = await run(model);
    const scale = Math.max(...ref.map(Math.abs));
    expect(maxDiff(ref, await run(out)) / scale).toBeLessThan(0.02);
  });

  it("leaves small tensors and unknown variants alone", () => {
    const small = Buffer.concat([v(1, 8), b(8, v(2, 11)), b(7, Buffer.concat([b(1, node("Add", ["X", "B"], ["Y"])), b(5, floatTensor("B", [32], B))]))]);
    expect(light(small, "fp16w").equals(small)).toBe(true);
    expect(() => light(model, "int4")).toThrow();
  });

  it("pins a light file for each ONNX of the model, all smaller", () => {
    const onnx = supertonicFiles.filter((f) => f.path.endsWith(".onnx"));
    expect(supertonicLightFiles.map((f) => f.path)).toEqual(onnx.map((f) => f.path));
    for (const f of supertonicLightFiles) {
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(f.bytes).toBeLessThan(onnx.find((o) => o.path === f.path)!.bytes * 0.55);
    }
  });
});

// With SUPERTONIC_DIR pointing at the pinned original files: the script
// rebuilds exactly the pinned fp16 files (what scripts/models/sync-r2.mjs uploads).
const dir = process.env.SUPERTONIC_DIR;
describe.skipIf(!dir)("onnx-light with the real Supertonic model", () => {
  it("rebuilds the pinned fp16 files", async () => {
    for (const f of supertonicLightFiles) {
      const out = light(await readFile(join(dir!, f.path)), "fp16w");
      expect(out.length).toBe(f.bytes);
      expect(createHash("sha256").update(out).digest("hex")).toBe(f.sha256);
    }
  }, 300_000);
});
