"use client";

import { createWorkerClient } from "@/lib/worker-rpc";

const call = createWorkerClient(
  () => new Worker(new URL("../../workers/pdf.worker.ts", import.meta.url), { type: "module" }),
);

const read = async (files: readonly Blob[]) =>
  Promise.all(files.map(async (f) => new Uint8Array(await f.arrayBuffer())));

const pdfBlob = (bytes: Uint8Array) => new Blob([bytes.slice().buffer], { type: "application/pdf" });

export async function mergePdfFiles(files: readonly Blob[], onProgress?: (p: number) => void) {
  const buffers = await read(files);
  const result = await call<Uint8Array>("merge", buffers, {
    transfer: buffers.map((b) => b.buffer),
    onProgress,
  });
  return pdfBlob(result);
}
