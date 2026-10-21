/// <reference lib="webworker" />
import { encoders } from "@/lib/image/codecs";
import { resizeRaw } from "@/lib/image/canvas";
import {
  fitToTarget,
  levelQuality,
  minScaleFor,
  pngColors,
  targetFormat,
  type CompressFormat,
  type CompressionLevel,
} from "@/lib/image/compress";
import { decodeImage } from "@/lib/image/decode";
import { isDamagedImage } from "@/lib/image/integrity";
import { DEFAULT_QUALITY } from "@/lib/image/options";
import type { RawImage } from "@/lib/image/pixels";
import { quantizedPng } from "@/lib/image/png-indexed";
import { planResize, type ResizeRequest } from "@/lib/image/resize-plan";
import type { FormatId } from "@/config/formats";
import { ConversionError } from "@/lib/convert-error";
import { exposeHandlers } from "@/lib/worker-rpc";

// Image tools built on the decoders/encoders of the converter (compress,
// resize). Runs on the job pool of `@/lib/jobs`: cancelling terminates it.

export interface CompressArgs {
  input: Blob;
  from: CompressFormat;
  to: CompressFormat | "same";
  mode: { kind: "level"; level: CompressionLevel } | { kind: "target"; bytes: number };
}

export interface CompressResult {
  buffer: ArrayBuffer;
  format: CompressFormat;
  width: number;
  height: number;
  /** The original was already smaller than any result: it is returned as is. */
  kept: boolean;
  /** Quality used (lossy formats), and the scale applied in target mode. */
  quality?: number;
  scale: number;
}

async function decode(buffer: ArrayBuffer, from: FormatId): Promise<RawImage> {
  if (isDamagedImage(new Uint8Array(buffer), from)) throw new ConversionError("fileDamaged");
  try {
    return await decodeImage(buffer, from);
  } catch {
    throw new ConversionError("fileDamaged");
  }
}

async function encodePng(image: RawImage, level: CompressionLevel) {
  const colors = pngColors(level);
  const png = colors ? await quantizedPng(image, colors) : await encoders.png!(image, {});
  // The single-threaded build directly: the threaded one needs cross-origin
  // isolation (we don't enable it) and its self-spawning worker breaks the build.
  const { default: init, optimise } = await import("@jsquash/oxipng/codec/pkg/squoosh_oxipng.js");
  await init();
  return optimise(new Uint8Array(png), 3, false, true).slice().buffer;
}

async function encode(image: RawImage, format: FormatId, quality: number) {
  const encoder = encoders[format];
  if (!encoder) throw new Error(`No encoder for ${format}`);
  return encoder(image, { quality });
}

async function compress(
  { input, from, to, mode }: CompressArgs,
  onProgress: (progress: number) => void,
): Promise<{ result: CompressResult; transfer: Transferable[] }> {
  const original = await input.arrayBuffer();
  const image = await decode(original, from);
  onProgress(0.15);
  const done = (result: Omit<CompressResult, "width" | "height"> & Partial<CompressResult>) => ({
    result: { width: image.width, height: image.height, ...result },
    transfer: [result.buffer],
  });

  if (mode.kind === "level") {
    const format = to === "same" ? from : to;
    const quality = levelQuality(mode.level);
    const buffer = format === "png" ? await encodePng(image, mode.level) : await encode(image, format, quality);
    onProgress(1);
    // Re-encoding an already optimized file can make it bigger: keep the original then.
    if (format === from && buffer.byteLength >= original.byteLength) {
      return done({ buffer: original, format, kept: true, scale: 1 });
    }
    return done({ buffer, format, kept: false, quality: format === "png" ? undefined : quality, scale: 1 });
  }

  const format = targetFormat(from, to);
  if (format === from && original.byteLength <= mode.bytes) {
    return done({ buffer: original, format, kept: true, scale: 1 });
  }
  const resized = new Map<number, RawImage>();
  const at = async (scale: number) => {
    if (scale === 1) return image;
    let cached = resized.get(scale);
    if (!cached) {
      const size = {
        width: Math.max(1, Math.round(image.width * scale)),
        height: Math.max(1, Math.round(image.height * scale)),
      };
      cached = await resizeRaw(image, size);
      resized.clear(); // one size at a time: big photos take hundreds of MB each
      resized.set(scale, cached);
    }
    return cached;
  };
  const fit = await fitToTarget(async (quality, scale) => encode(await at(scale), format, quality), mode.bytes, {
    minScale: minScaleFor(image.width, image.height),
    // About 8 encodes per size tried.
    onStep: (step) => onProgress(Math.min(0.95, 0.15 + step * 0.08)),
  });
  if (!fit) throw new ConversionError("targetTooSmall");
  const final = await at(fit.scale);
  onProgress(1);
  return done({
    buffer: fit.bytes,
    format,
    kept: false,
    quality: fit.quality,
    scale: fit.scale,
    width: final.width,
    height: final.height,
  });
}

export interface ResizeArgs {
  input: Blob;
  from: FormatId;
  /** An output format the image worker can encode. */
  to: FormatId;
  request: ResizeRequest;
}

export interface ResizeResult {
  buffer: ArrayBuffer;
  before: { width: number; height: number };
  width: number;
  height: number;
}

async function resize({ input, from, to, request }: ResizeArgs, onProgress: (progress: number) => void) {
  const image = await decode(await input.arrayBuffer(), from);
  onProgress(0.3);
  const plan = planResize(image, request);
  if (!plan) throw new ConversionError("invalidRequest");
  const source = await createImageBitmap(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height));
  let resized: RawImage;
  try {
    const ctx = new OffscreenCanvas(plan.size.width, plan.size.height).getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.imageSmoothingQuality = "high";
    // Borders are white where the format has no transparency, transparent elsewhere.
    if (plan.padded && (to === "jpg" || to === "bmp")) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, plan.size.width, plan.size.height);
    }
    const { source: s, target: t } = plan;
    ctx.drawImage(source, s.x, s.y, s.width, s.height, t.x, t.y, t.width, t.height);
    resized = ctx.getImageData(0, 0, plan.size.width, plan.size.height);
  } finally {
    source.close();
  }
  onProgress(0.6);
  const buffer = await encode(resized, to, DEFAULT_QUALITY);
  onProgress(1);
  const result: ResizeResult = {
    buffer,
    before: { width: image.width, height: image.height },
    width: resized.width,
    height: resized.height,
  };
  return { result, transfer: [buffer] };
}

exposeHandlers({ compress, resize });
