/// <reference lib="webworker" />
import type { FormatId } from "@/config/formats";
import { applyMask, downscale, MAX_PIXELS, segment, viewSize, workSize, type Background } from "@/lib/bg-remove/cutout";
import type { PaintStroke } from "@/lib/bg-remove/paint";
import type { Rect, Stroke } from "@/lib/bg-remove/grabcut";
import { segmentPerson } from "@/lib/bg-remove/people";
import { ConversionError } from "@/lib/convert-error";
import { encoders } from "@/lib/image/codecs";
import { decodeImage } from "@/lib/image/decode";
import { isDamagedImage } from "@/lib/image/integrity";
import { exposeHandlers } from "@/lib/worker-rpc";

// Assisted cutout (GrabCut, our own code, no model) off the main thread.
// Stateless: the page keeps the reduced copy and sends it with each cut, so
// a restarted worker loses nothing.

async function decode(input: Blob, from: FormatId) {
  const bytes = await input.arrayBuffer();
  // Browsers draw a truncated JPEG or PNG with a grey or empty part instead of failing.
  if (isDamagedImage(new Uint8Array(bytes), from)) throw new ConversionError("fileDamaged");
  let image;
  try {
    image = await decodeImage(bytes, from);
  } catch {
    throw new ConversionError("fileDamaged");
  }
  if (image.width * image.height > MAX_PIXELS) throw new ConversionError("fileTooLarge");
  return image;
}

/** The photo → its size, the reduced copy GrabCut works on and a larger one for the zoomable editor. */
async function prepare({ input, from }: { input: Blob; from: FormatId }) {
  const image = await decode(input, from);
  const ws = workSize(image.width, image.height);
  const work = downscale(image.data, image.width, image.height, ws.width, ws.height);
  const vs = viewSize(image.width, image.height);
  const view = downscale(image.data, image.width, image.height, vs.width, vs.height);
  return {
    result: {
      width: image.width,
      height: image.height,
      workWidth: ws.width,
      workHeight: ws.height,
      work: work.buffer,
      viewWidth: vs.width,
      viewHeight: vs.height,
      view: view.buffer,
    },
    transfer: [work.buffer as ArrayBuffer, view.buffer as ArrayBuffer],
  };
}

/** Rectangle and strokes (work pixels) → soft mask (0–255, work size). */
async function cut({ work, workWidth, workHeight, rect, strokes }: { work: ArrayBuffer; workWidth: number; workHeight: number; rect: Rect; strokes: Stroke[] }) {
  const mask = segment(new Uint8ClampedArray(work), workWidth, workHeight, rect, strokes);
  return { result: { mask: mask.buffer }, transfer: [mask.buffer as ArrayBuffer] };
}

/** "People" mode: person probability from MediaPipe (0–255, work size) and strokes → soft mask. */
async function cutPerson({ work, workWidth, workHeight, prob, strokes }: { work: ArrayBuffer; workWidth: number; workHeight: number; prob: ArrayBuffer; strokes: Stroke[] }) {
  const mask = segmentPerson(new Uint8ClampedArray(work), workWidth, workHeight, new Uint8Array(prob), strokes);
  return { result: { mask: mask.buffer }, transfer: [mask.buffer as ArrayBuffer] };
}

/** The full-size result: PNG with transparency, or JPG/WEBP over a color. */
async function exportImage(
  { input, from, mask, maskWidth, maskHeight, background, to, quality, paint = [] }: {
    input: Blob;
    /** "Erase"/"restore" strokes in original pixels, applied over the cut. */
    paint?: PaintStroke[];
    from: FormatId;
    mask: ArrayBuffer;
    maskWidth: number;
    maskHeight: number;
    background: Background;
    to: "png" | "jpg" | "webp";
    quality?: number;
  },
  onProgress: (p: number) => void,
) {
  const image = await decode(input, from);
  onProgress(0.3);
  const data = new Uint8ClampedArray(image.data);
  applyMask(data, image.width, image.height, new Uint8Array(mask), maskWidth, maskHeight, to === "png" ? background : background.kind === "color" ? background : { kind: "color", rgb: [255, 255, 255] }, paint);
  onProgress(0.6);
  const encode = encoders[to];
  if (!encode) throw new Error(`No encoder for ${to}`);
  const buffer = await encode({ width: image.width, height: image.height, data }, { quality });
  onProgress(1);
  return { result: { buffer, width: image.width, height: image.height }, transfer: [buffer] };
}

exposeHandlers({ prepare, cut, cutPerson, exportImage });
