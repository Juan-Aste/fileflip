"use client";

import type { FormatId } from "@/config/formats";
import { jpegOrientation } from "@/lib/image/exif";
import { convertImage } from "@/lib/image/client";
import { createWorkerClient } from "@/lib/worker-rpc";
import type { PageSize, PageSpec, PdfImage, Rotation } from "./ops";

const call = createWorkerClient(
  () => new Worker(new URL("../../workers/pdf.worker.ts", import.meta.url), { type: "module" }),
);

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
  if (format === "jpg") {
    const bytes = await bytesOf(file);
    if (jpegOrientation(bytes) === 1) return { bytes, type: "jpg" };
    // Re-encode so the EXIF rotation is baked into the pixels.
  }
  if (format === "png") return { bytes: await bytesOf(file), type: "png" };
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
    images.push(await toPdfImage(file, format));
    onProgress?.(((i + 1) / files.length) * 0.5);
  }
  const result = await call<Uint8Array>(
    "images",
    { images, pageSize, margin },
    { transfer: images.map((im) => im.bytes.buffer), onProgress: (p) => onProgress?.(0.5 + p * 0.5) },
  );
  return pdfBlob(result);
}
