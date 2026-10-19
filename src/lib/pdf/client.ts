"use client";

import { createWorkerClient } from "@/lib/worker-rpc";
import type { Rotation } from "./ops";

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
