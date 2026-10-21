"use client";

import type { FormatId } from "@/config/formats";
import { ConversionError, InputFileError, errorCode } from "@/lib/convert-error";
import { jpegOrientation } from "@/lib/image/exif";
import { convertImage } from "@/lib/image/client";
import { isDamagedImage } from "@/lib/image/integrity";
import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { CompressionLevel, CompressResult } from "./compress";
import type { PageSize, PageSpec, PdfImage, Rotation } from "./ops";
import type { Margins } from "./crop";
import type { Permissions } from "./password-options";
import type { SignaturePlacement } from "./sign";
import type { PageNumberOptions, WatermarkOptions } from "./stamp";

// One PDF worker at a time (documents can take hundreds of MB). A job that
// hangs inside pdf-lib is stopped by the time limit, which restarts the worker.
const PDF_JOB_TIMEOUT_MS = 10 * 60_000;
const pool = createJobPool(
  () => new Worker(new URL("../../workers/pdf.worker.ts", import.meta.url), { type: "module" }),
);
const call = <T>(method: string, args: unknown, options: JobOptions = {}) =>
  pool.run<T>(method, args, { timeoutMs: PDF_JOB_TIMEOUT_MS, ...options });

const bytesOf = async (file: Blob) => new Uint8Array(await file.arrayBuffer());

export const pdfBlob = (bytes: Uint8Array) => new Blob([bytes.slice().buffer], { type: "application/pdf" });

export async function countPdfPages(file: Blob): Promise<number> {
  const bytes = await bytesOf(file);
  return call<number>("count", bytes, { transfer: [bytes.buffer] });
}

export async function mergePdfFiles(files: readonly Blob[], onProgress?: (p: number) => void) {
  const buffers = await Promise.all(files.map(bytesOf));
  const result = await call<Uint8Array>("merge", buffers, {
    transfer: buffers.map((b) => b.buffer),
    onProgress,
  });
  return pdfBlob(result);
}

export async function splitPdfFile(file: Blob, groups: number[][], onProgress?: (p: number) => void) {
  const bytes = await bytesOf(file);
  const result = await call<Uint8Array[]>("split", { bytes, groups }, { transfer: [bytes.buffer], onProgress });
  return result.map(pdfBlob);
}

export async function rotatePdfFile(file: Blob, rotation: Rotation, pages?: number[]) {
  const bytes = await bytesOf(file);
  const result = await call<Uint8Array>("rotate", { bytes, rotation, pages }, { transfer: [bytes.buffer] });
  return pdfBlob(result);
}

export async function organizePdfFile(file: Blob, specs: PageSpec[]) {
  const bytes = await bytesOf(file);
  const result = await call<Uint8Array>("organize", { bytes, specs }, { transfer: [bytes.buffer] });
  return pdfBlob(result);
}

// Graphics usually need transparency and sharp edges; photos compress better as JPG.
const PNG_SOURCES: readonly FormatId[] = ["png", "gif", "ico", "svg"];

/** Gets an image into a form pdf-lib can embed (JPG or PNG, upright). */
async function toPdfImage(file: Blob, format: FormatId): Promise<PdfImage> {
  if (format === "jpg" || format === "png") {
    const bytes = await bytesOf(file);
    // pdf-lib embeds cut JPEGs silently and can hang on a cut PNG.
    if (isDamagedImage(bytes, format)) throw new ConversionError("fileDamaged");
    if (format === "png") return { bytes, type: "png" };
    if (jpegOrientation(bytes) === 1) return { bytes, type: "jpg" };
    // Re-encode so the EXIF rotation is baked into the pixels.
  }
  const type = PNG_SOURCES.includes(format) ? "png" : "jpg";
  const { blob } = await convertImage(file, format, type, { quality: 92 });
  return { bytes: await bytesOf(blob), type };
}

export async function imagesToPdfFile(
  files: readonly { file: Blob; format: FormatId }[],
  { pageSize = "fit", margin = 0 }: { pageSize?: PageSize; margin?: number } = {},
  onProgress?: (p: number) => void,
) {
  const images: PdfImage[] = [];
  for (const [i, { file, format }] of files.entries()) {
    try {
      images.push(await toPdfImage(file, format));
    } catch (error) {
      throw new InputFileError(errorCode(error), i);
    }
    onProgress?.(((i + 1) / files.length) * 0.5);
  }
  const result = await call<Uint8Array>(
    "images",
    { images, pageSize, margin },
    { transfer: images.map((im) => im.bytes.buffer), onProgress: (p) => onProgress?.(0.5 + p * 0.5) },
  );
  return pdfBlob(result);
}

export async function compressPdfFile(file: Blob, level: CompressionLevel, onProgress?: (p: number) => void) {
  const bytes = await bytesOf(file);
  const result = await call<CompressResult>("compress", { bytes, level }, { transfer: [bytes.buffer], onProgress });
  return { blob: pdfBlob(result.bytes), imagesRecompressed: result.imagesRecompressed };
}

/** Page numbers drawn on every page (or from page 2). */
export async function numberPdfPages(file: Blob, options: PageNumberOptions, job: JobOptions = {}) {
  const bytes = await bytesOf(file);
  return pdfBlob(await call<Uint8Array>("pageNumbers", { bytes, options }, { transfer: [bytes.buffer], ...job }));
}

/** A text watermark on every page (or the chosen ones). */
export async function watermarkPdf(file: Blob, options: WatermarkOptions, job: JobOptions = {}) {
  const bytes = await bytesOf(file);
  return pdfBlob(await call<Uint8Array>("watermark", { bytes, options }, { transfer: [bytes.buffer], ...job }));
}

/** Sets each page's CropBox (null leaves a page as it is). */
export async function cropPdfFile(file: Blob, margins: (Margins | null)[], job: JobOptions = {}) {
  const bytes = await bytesOf(file);
  return pdfBlob(await call<Uint8Array>("crop", { bytes, margins }, { transfer: [bytes.buffer], ...job }));
}

/** Draws a signature (PNG) at the given places. */
export async function signPdfFile(file: Blob, png: Blob, placements: SignaturePlacement[], job: JobOptions = {}) {
  const bytes = await bytesOf(file);
  const image = await bytesOf(png);
  return pdfBlob(await call<Uint8Array>("sign", { bytes, png: image, placements }, { transfer: [bytes.buffer, image.buffer], ...job }));
}

/** Encrypts with AES-256 and an open password (qpdf). */
export async function protectPdfFile(file: Blob, password: string, permissions: Permissions, job: JobOptions = {}) {
  const bytes = await bytesOf(file);
  return pdfBlob(await call<Uint8Array>("protect", { bytes, password, permissions }, { transfer: [bytes.buffer], ...job }));
}

/** Removes the encryption, given the password (qpdf). */
export async function unlockPdfFile(file: Blob, password: string, job: JobOptions = {}) {
  const bytes = await bytesOf(file);
  return pdfBlob(await call<Uint8Array>("unlock", { bytes, password }, { transfer: [bytes.buffer], ...job }));
}

/** The images stored as plain JPEG, by object reference ("12R"), to save them unchanged. */
export async function originalPdfJpegs(file: Blob, job: JobOptions = {}) {
  const bytes = await bytesOf(file);
  return call<Record<string, Uint8Array>>("jpegs", bytes, { transfer: [bytes.buffer], ...job });
}
