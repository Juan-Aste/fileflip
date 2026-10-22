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
import { isValidCrop, type Rect } from "@/lib/image/crop-rect";
import { adaptiveThreshold, enhancedGray, isValidQuad, scanSize, warpQuad, type Quad, type ScanMode } from "@/lib/image/scan";
import { ID_PHOTO_DPI, ID_SHEET_DPI, idPhotoPresets, mmToPx, photoPixels, setJpegDpi, sheetLayout, type IdPhotoPreset } from "@/lib/image/id-photo";
import { decodeImage } from "@/lib/image/decode";
import {
  FAVICON_MASTER,
  faviconIcoSizes,
  faviconPngs,
  headSnippet,
  squarePlan,
  webManifest,
  type FaviconFit,
} from "@/lib/image/favicon";
import { encodeIco } from "@/lib/image/ico";
import { drawOverlay, type OverlaySpec } from "@/lib/image/overlay";
import { isDamagedImage } from "@/lib/image/integrity";
import { DEFAULT_QUALITY } from "@/lib/image/options";
import type { RawImage } from "@/lib/image/pixels";
import { quantizedPng } from "@/lib/image/png-indexed";
import { planResize, type ResizeRequest } from "@/lib/image/resize-plan";
import {
  MalformedImageError,
  stripJpeg,
  stripPng,
  stripWebp,
  summarizeMetadata,
  webpExif,
  type MetadataSummary,
} from "@/lib/image/metadata";
import type { FormatId } from "@/config/formats";
import { ConversionError } from "@/lib/convert-error";
import { exposeHandlers } from "@/lib/worker-rpc";

// Image tools built on the decoders/encoders of the converter (compress,
// resize, rotate, remove metadata). Runs on the job pool of `@/lib/jobs`: cancelling terminates it.

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

/** Quality when a tool has to re-encode a lossy image it doesn't mean to shrink. */
const KEEP_QUALITY = 92;

export interface TransformArgs {
  input: Blob;
  from: FormatId;
  to: FormatId;
  /** Clockwise degrees, applied before the flips. */
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

/**
 * Rotates and/or flips. The browser decoder applies the EXIF orientation
 * first, so the result is upright as seen and carries no orientation tag.
 */
async function transform({ input, from, to, rotate, flipH, flipV }: TransformArgs, onProgress: (progress: number) => void) {
  const image = await decode(await input.arrayBuffer(), from);
  onProgress(0.3);
  const turned = rotate === 90 || rotate === 270;
  const width = turned ? image.height : image.width;
  const height = turned ? image.width : image.height;
  const source = await createImageBitmap(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height));
  let out: RawImage;
  try {
    const ctx = new OffscreenCanvas(width, height).getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.translate(width / 2, height / 2);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.drawImage(source, -image.width / 2, -image.height / 2);
    out = ctx.getImageData(0, 0, width, height);
  } finally {
    source.close();
  }
  onProgress(0.6);
  const buffer = await encode(out, to, KEEP_QUALITY);
  onProgress(1);
  return { result: { buffer, width, height }, transfer: [buffer] };
}

export interface StripArgs {
  input: Blob;
  from: "jpg" | "png" | "webp" | "heic";
}

export interface StripResult {
  buffer: ArrayBuffer;
  format: "jpg" | "png" | "webp";
  /** What was found (and removed). */
  summary: MetadataSummary;
  /** Bytes of metadata removed; for HEIC the size difference isn't meaningful. */
  removedBytes: number;
  reencoded: boolean;
}

async function readSummary(bytes: Uint8Array, from: StripArgs["from"]): Promise<MetadataSummary> {
  try {
    const { default: exifr } = await import("exifr");
    // exifr reads JPEG, PNG and HEIC; for WEBP it gets the EXIF block (TIFF data).
    const source = from === "webp" ? webpExif(bytes) : bytes;
    if (!source) return {};
    return summarizeMetadata(await exifr.parse(source, { gps: true, xmp: true, iptc: true }));
  } catch {
    // Unreadable metadata is still removed; the summary just stays empty.
    return {};
  }
}

async function strip({ input, from }: StripArgs, onProgress: (progress: number) => void) {
  const original = new Uint8Array(await input.arrayBuffer());
  const summary = await readSummary(original, from);
  onProgress(0.4);
  let result: StripResult;
  if (from === "heic") {
    // No HEIC writer: the photo is re-encoded as a JPEG without any metadata.
    const image = await decode(original.buffer, "heic");
    const buffer = await encode(image, "jpg", KEEP_QUALITY);
    result = { buffer, format: "jpg", summary, removedBytes: 0, reencoded: true };
  } else {
    try {
      const stripped = (from === "jpg" ? stripJpeg : from === "png" ? stripPng : stripWebp)(original);
      const buffer = stripped.bytes.slice().buffer;
      result = { buffer, format: from, summary, removedBytes: Math.max(0, original.length - buffer.byteLength), reencoded: false };
    } catch (error) {
      if (error instanceof MalformedImageError) throw new ConversionError("fileDamaged");
      throw error;
    }
  }
  onProgress(1);
  return { result, transfer: [result.buffer] };
}

export interface PreviewArgs {
  input: Blob;
  from: FormatId;
  /** Longest side of the preview, in pixels. */
  maxSide: number;
}

export interface PreviewResult {
  /** A JPEG small enough to show while editing. */
  blob: Blob;
  /** Size of the full image, as decoded (EXIF orientation applied). */
  width: number;
  height: number;
}

/**
 * Preview for tools that edit before running (crop): it comes from the same
 * decoder as the final result, so coordinates match even for HEIC or TIFF,
 * which the browser cannot show in an <img>.
 */
async function preview({ input, from, maxSide }: PreviewArgs) {
  const image = await decode(await input.arrayBuffer(), from);
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const size = { width: Math.max(1, Math.round(image.width * scale)), height: Math.max(1, Math.round(image.height * scale)) };
  const small = scale < 1 ? await resizeRaw(image, size) : image;
  const canvas = new OffscreenCanvas(size.width, size.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");
  // White behind transparent areas: the preview is only for framing.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size.width, size.height);
  const bitmap = await createImageBitmap(new ImageData(new Uint8ClampedArray(small.data), small.width, small.height));
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
  const result: PreviewResult = { blob, width: image.width, height: image.height };
  return { result };
}

export interface CropArgs {
  input: Blob;
  from: FormatId;
  to: FormatId;
  /** In pixels of the decoded image. */
  rect: Rect;
}

async function crop({ input, from, to, rect }: CropArgs, onProgress: (progress: number) => void) {
  const image = await decode(await input.arrayBuffer(), from);
  if (!isValidCrop(rect, image)) throw new ConversionError("invalidRequest");
  onProgress(0.4);
  // Copy the rows of the rectangle: no resampling, the pixels stay exact.
  const data = new Uint8ClampedArray(rect.width * rect.height * 4);
  for (let row = 0; row < rect.height; row++) {
    const start = ((rect.y + row) * image.width + rect.x) * 4;
    data.set(image.data.subarray(start, start + rect.width * 4), row * rect.width * 4);
  }
  const buffer = await encode({ data, width: rect.width, height: rect.height }, to, KEEP_QUALITY);
  onProgress(1);
  return { result: { buffer, width: rect.width, height: rect.height }, transfer: [buffer] };
}

export interface OverlayArgs {
  input: Blob;
  from: FormatId;
  to: FormatId;
  spec: OverlaySpec;
  /** PNG, JPG or WEBP, for logo overlays. */
  logo?: Blob;
}

async function overlay({ input, from, to, spec, logo }: OverlayArgs, onProgress: (progress: number) => void) {
  const image = await decode(await input.arrayBuffer(), from);
  onProgress(0.3);
  let logoBitmap: ImageBitmap | undefined;
  if (spec.item.kind === "logo") {
    if (!logo) throw new ConversionError("invalidRequest");
    try {
      logoBitmap = await createImageBitmap(logo);
    } catch {
      throw new ConversionError("fileDamaged");
    }
  }
  const source = await createImageBitmap(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height));
  let out: RawImage;
  try {
    const ctx = new OffscreenCanvas(image.width, image.height).getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.drawImage(source, 0, 0);
    drawOverlay(ctx, image.width, image.height, spec, logoBitmap);
    out = ctx.getImageData(0, 0, image.width, image.height);
  } finally {
    source.close();
    logoBitmap?.close();
  }
  onProgress(0.6);
  const buffer = await encode(out, to, KEEP_QUALITY);
  onProgress(1);
  return { result: { buffer, width: image.width, height: image.height }, transfer: [buffer] };
}

export interface FaviconArgs {
  /** A raster image, or the pixels of an SVG already rasterized on the page (workers can't render SVG). */
  input: { blob: Blob; from: FormatId } | { pixels: RawImage };
  fit: FaviconFit;
  /** #rrggbb, or null for transparent. */
  background: string | null;
  appName: string;
}

export interface FaviconResult {
  files: { name: string; buffer: ArrayBuffer; mime: string }[];
}

async function favicon({ input, fit, background, appName }: FaviconArgs, onProgress: (progress: number) => void) {
  const image = "pixels" in input ? input.pixels : await decode(await input.blob.arrayBuffer(), input.from);
  onProgress(0.2);
  const plan = squarePlan(image.width, image.height, fit);
  const source = await createImageBitmap(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height));
  const master = new OffscreenCanvas(FAVICON_MASTER, FAVICON_MASTER);
  try {
    const ctx = master.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.imageSmoothingQuality = "high";
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, FAVICON_MASTER, FAVICON_MASTER);
    }
    const { source: s, target: t } = plan;
    ctx.drawImage(source, s.x, s.y, s.width, s.height, t.x, t.y, t.width, t.height);
  } finally {
    source.close();
  }
  const scaled = (side: number, opaque: boolean): RawImage => {
    const ctx = new OffscreenCanvas(side, side).getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.imageSmoothingQuality = "high";
    if (opaque) {
      ctx.fillStyle = background ?? "#ffffff";
      ctx.fillRect(0, 0, side, side);
    }
    ctx.drawImage(master, 0, 0, side, side);
    return ctx.getImageData(0, 0, side, side);
  };
  const png = (image: RawImage) => encoders.png!(image, {});
  const files: FaviconResult["files"] = [];
  const ico = await Promise.all(faviconIcoSizes.map(async (size) => ({ size, png: await png(scaled(size, false)) })));
  files.push({ name: "favicon.ico", buffer: encodeIco(ico), mime: "image/x-icon" });
  for (const [i, file] of faviconPngs.entries()) {
    files.push({ name: file.name, buffer: await png(scaled(file.size, file.opaque)), mime: "image/png" });
    onProgress(0.3 + (0.6 * (i + 1)) / faviconPngs.length);
  }
  const text = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;
  files.push({ name: "site.webmanifest", buffer: text(webManifest(appName, background)), mime: "application/manifest+json" });
  files.push({ name: "favicon-head.html", buffer: text(headSnippet), mime: "text/html" });
  onProgress(1);
  const result: FaviconResult = { files };
  return { result, transfer: files.map((f) => f.buffer) };
}

export interface IdPhotoArgs {
  input: Blob;
  from: FormatId;
  /** The framed area, in pixels of the decoded image, with the preset's proportions. */
  rect: Rect;
  preset: IdPhotoPreset;
}

export interface IdPhotoResult {
  /** The photo at ID_PHOTO_DPI and the 10 × 15 cm sheet at ID_SHEET_DPI, both JPEG with that resolution in their header. */
  photo: ArrayBuffer;
  sheet: ArrayBuffer;
  width: number;
  height: number;
  copies: number;
  /** The framed area has fewer pixels than the print needs at 300 dpi: it will look soft. */
  lowResolution: boolean;
}

async function idPhoto({ input, from, rect, preset }: IdPhotoArgs, onProgress: (progress: number) => void) {
  const image = await decode(await input.arrayBuffer(), from);
  if (!isValidCrop(rect, image)) throw new ConversionError("invalidRequest");
  onProgress(0.3);
  const size = photoPixels(preset);
  const source = await createImageBitmap(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height));
  const photoCanvas = new OffscreenCanvas(size.width, size.height);
  const pc = photoCanvas.getContext("2d")!;
  pc.imageSmoothingQuality = "high";
  // White behind transparent areas: documents want a light, even background.
  pc.fillStyle = "#ffffff";
  pc.fillRect(0, 0, size.width, size.height);
  pc.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, size.width, size.height);
  source.close();
  const photo = setJpegDpi(new Uint8Array(await encode(pc.getImageData(0, 0, size.width, size.height), "jpg", KEEP_QUALITY)), ID_PHOTO_DPI);
  onProgress(0.6);

  const layout = sheetLayout(preset);
  const sheetCanvas = new OffscreenCanvas(mmToPx(layout.width, ID_SHEET_DPI), mmToPx(layout.height, ID_SHEET_DPI));
  const sc = sheetCanvas.getContext("2d")!;
  sc.imageSmoothingQuality = "high";
  sc.fillStyle = "#ffffff";
  sc.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);
  const { width: wMm, height: hMm } = idPhotoPresets[preset];
  const [w, h] = [mmToPx(wMm, ID_SHEET_DPI), mmToPx(hMm, ID_SHEET_DPI)];
  // Thin grey outlines just outside each copy, to cut along.
  sc.strokeStyle = "#bdbdbd";
  sc.lineWidth = 1;
  for (const c of layout.copies) {
    const [x, y] = [mmToPx(c.x, ID_SHEET_DPI), mmToPx(c.y, ID_SHEET_DPI)];
    sc.drawImage(photoCanvas, x, y, w, h);
    sc.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  }
  const sheet = setJpegDpi(new Uint8Array(await encode(sc.getImageData(0, 0, sheetCanvas.width, sheetCanvas.height), "jpg", KEEP_QUALITY)), ID_SHEET_DPI);
  onProgress(1);
  const result: IdPhotoResult = {
    photo: photo.buffer as ArrayBuffer,
    sheet: sheet.buffer as ArrayBuffer,
    ...size,
    copies: layout.copies.length,
    lowResolution: rect.width < mmToPx(wMm, 300) || rect.height < mmToPx(hMm, 300),
  };
  return { result, transfer: [result.photo, result.sheet] };
}

export interface ScanArgs {
  pages: { input: Blob; from: FormatId; quad: Quad }[];
  mode: ScanMode;
  paper: ScanPaper;
}
export type ScanPaper = "a4" | "letter" | "fit";

/** Page sizes in points; "fit" uses the straightened photo's own proportions at 200 dpi. */
const PAPERS = { a4: [595.28, 841.89], letter: [612, 792] } as const;

/** Photos of pages → one PDF: each page straightened, cleaned up and filling its page (turned to match). */
async function scan({ pages, mode, paper }: ScanArgs, onProgress: (progress: number) => void) {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setCreator("Fileflect");
  doc.setProducer("Fileflect (pdf-lib)");
  for (const [i, page] of pages.entries()) {
    const image = await decode(await page.input.arrayBuffer(), page.from);
    if (!isValidQuad(page.quad, image.width, image.height)) throw new ConversionError("invalidRequest");
    const flat = warpQuad(image, page.quad, scanSize(page.quad));
    const clean = mode === "bw" ? adaptiveThreshold(flat) : mode === "gray" ? enhancedGray(flat) : flat;
    // Two-color PNG for black and white (small and sharp), JPEG for photos of grey or color pages.
    const embedded = mode === "bw" ? await doc.embedPng(await quantizedPng(clean, 2)) : await doc.embedJpg(await encode(clean, "jpg", 85));
    const [w, h] = paper === "fit" ? [(clean.width / 200) * 72, (clean.height / 200) * 72] : clean.width > clean.height ? [PAPERS[paper][1], PAPERS[paper][0]] : PAPERS[paper];
    const pdfPage = doc.addPage([w, h]);
    const k = Math.min(w / clean.width, h / clean.height);
    pdfPage.drawImage(embedded, { x: (w - clean.width * k) / 2, y: (h - clean.height * k) / 2, width: clean.width * k, height: clean.height * k });
    onProgress((i + 1) / (pages.length + 0.2));
  }
  const pdf = await doc.save();
  onProgress(1);
  const buffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return { result: { buffer, pages: pages.length }, transfer: [buffer] };
}

exposeHandlers({ compress, resize, transform, strip, preview, crop, overlay, favicon, idPhoto, scan });
