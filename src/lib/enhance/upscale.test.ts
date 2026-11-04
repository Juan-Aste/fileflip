import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import type { InferenceSession } from "onnxruntime-web";
import type { RawImage } from "@/lib/image/pixels";
import { sha256Hex } from "@/lib/tts/model-cache";
import { bicubicUpscale, downscale, laplacianVariance, psnr } from "./metrics";
import { PAD, UPSCALE_MODEL } from "./model";
import { planTiles, upscaleTiled, type TileRunner } from "./tiles";
import { upscaleImage } from "./upscale";

const root = process.cwd();

async function readImage(path: string, resize?: { width: number; height: number }): Promise<RawImage> {
  let img = sharp(join(root, path));
  if (resize) img = img.resize(resize.width, resize.height, { fit: "cover" });
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
}

/** Nearest-neighbor "network": every pixel becomes a scale × scale block. */
const nearest =
  (scale: number): TileRunner =>
  async (input, w, h) => {
    const out = new Float32Array(3 * w * h * scale * scale);
    const ow = w * scale;
    for (let c = 0; c < 3; c++)
      for (let y = 0; y < h * scale; y++)
        for (let x = 0; x < ow; x++) out[c * ow * h * scale + y * ow + x] = input[c * w * h + Math.floor(y / scale) * w + Math.floor(x / scale)]!;
    return out;
  };

describe("planTiles", () => {
  it("covers every pixel exactly once and pads inside the image", () => {
    const tiles = planTiles(300, 130, 128, 24);
    expect(tiles).toHaveLength(6);
    const seen = new Uint8Array(300 * 130);
    for (const t of tiles) {
      for (let y = t.y; y < t.y + t.height; y++) for (let x = t.x; x < t.x + t.width; x++) seen[y * 300 + x]!++;
      expect(t.rx).toBe(Math.max(0, t.x - 24));
      expect(t.rx + t.rwidth).toBe(Math.min(300, t.x + t.width + 24));
    }
    expect(seen.every((v) => v === 1)).toBe(true);
  });
});

describe("upscaleTiled", () => {
  it("stitches tiles into exactly the whole-image result (nearest-neighbor runner)", async () => {
    const image = await readImage("tests/fixtures/photo.jpg", { width: 90, height: 70 });
    const tiled = await upscaleTiled(image, nearest(4), { scale: 4, tile: 32, pad: 5 });
    const whole = await upscaleTiled(image, nearest(4), { scale: 4, tile: 1000, pad: 0 });
    expect([tiled.width, tiled.height]).toEqual([360, 280]);
    expect(Buffer.from(tiled.data).equals(Buffer.from(whole.data))).toBe(true);
  });

  it("stops between tiles when cancelled", async () => {
    const image = await readImage("tests/fixtures/photo.jpg", { width: 64, height: 64 });
    const abort = new AbortController();
    let calls = 0;
    const runner: TileRunner = async (input, w, h) => {
      if (++calls === 2) abort.abort();
      return nearest(4)(input, w, h);
    };
    await expect(upscaleTiled(image, runner, { scale: 4, tile: 16, pad: 4, signal: abort.signal })).rejects.toThrow(/Aborted/);
    expect(calls).toBe(2);
  });
});

describe("Real-ESRGAN realesr-general-x4v3 (public/models)", () => {
  let session: InferenceSession;
  let ort: typeof import("onnxruntime-web");
  const run: TileRunner = async (input, w, h) => {
    const out = await session.run({ input: new ort.Tensor("float32", input, [1, 3, h, w]) });
    return out.output!.data as Float32Array;
  };

  beforeAll(async () => {
    const bytes = new Uint8Array(await readFile(join(root, "public", UPSCALE_MODEL.path)));
    expect(bytes.byteLength).toBe(UPSCALE_MODEL.bytes);
    expect(await sha256Hex(bytes)).toBe(UPSCALE_MODEL.sha256);
    ort = await import("onnxruntime-web");
    ort.env.wasm.numThreads = 1;
    session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
  }, 60_000);

  it("tiles with padding match the whole-image result (no visible seams)", async () => {
    const image = await readImage("tests/fixtures/people/person.jpg", { width: 80, height: 64 });
    const whole = await upscaleTiled(image, run, { scale: 4, tile: 1000, pad: 0 });
    const tiled = await upscaleTiled(image, run, { scale: 4, tile: 32, pad: PAD });
    const unpadded = await upscaleTiled(image, run, { scale: 4, tile: 32, pad: 0 });
    const padded = psnr(whole, tiled);
    const bare = psnr(whole, unpadded);
    console.log(`tiled vs whole: ${padded.toFixed(1)} dB with pad ${PAD}, ${bare.toFixed(1)} dB without`);
    expect(padded).toBeGreaterThan(45);
    expect(padded).toBeGreaterThan(bare + 5);
  }, 120_000);

  it("x4 and x2 give 4× and 2× the size and are sharper than bicubic", async () => {
    // The real photo (192 × 240) made 4× smaller, then enlarged back.
    const original = await readImage("tests/fixtures/people/person.jpg", { width: 192, height: 240 });
    const small = downscale(original, 4);
    const x4 = await upscaleImage(small, 4, run, { tile: 128 });
    expect([x4.width, x4.height]).toEqual([192, 240]);
    const bicubic = bicubicUpscale(small, 4);
    const lapAi = laplacianVariance(x4);
    const lapBicubic = laplacianVariance(bicubic);
    console.log(`Laplacian variance: AI ${lapAi.toFixed(1)}, bicubic ${lapBicubic.toFixed(1)}, original ${laplacianVariance(original).toFixed(1)}`);
    console.log(`PSNR vs original: AI ${psnr(x4, original).toFixed(2)} dB, bicubic ${psnr(bicubic, original).toFixed(2)} dB`);
    expect(lapAi).toBeGreaterThan(lapBicubic * 1.5);
    const x2 = await upscaleImage(small, 2, run, { tile: 128 });
    expect([x2.width, x2.height]).toEqual([96, 120]);
    expect(laplacianVariance(x2)).toBeGreaterThan(laplacianVariance(bicubicUpscale(small, 2)));
  }, 180_000);

  it("keeps transparency, enlarged smoothly", async () => {
    const image = await readImage("tests/fixtures/photo-alpha.png", { width: 48, height: 36 });
    const out = await upscaleImage(image, 2, run, { tile: 128 });
    expect([out.width, out.height]).toEqual([96, 72]);
    let transparent = 0;
    for (let i = 3; i < out.data.length; i += 4) if (out.data[i] === 0) transparent++;
    expect(transparent).toBeGreaterThan(out.width * out.height * 0.2);
  }, 60_000);
});
