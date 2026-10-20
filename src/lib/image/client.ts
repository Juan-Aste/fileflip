"use client";

import { formats, type FormatId } from "@/config/formats";
import type { ImageJob, ImageWorkerMessage, PreloadRequest } from "@/workers/protocol";
import { deviceConcurrency } from "@/lib/concurrency";
import { computeSize } from "./dimensions";
import { browserImageOutputs, type ImageOptions } from "./options";
import { svgIntrinsicSize } from "./svg";

export interface ImageResult {
  blob: Blob;
  width: number;
  height: number;
}

interface Pending {
  resolve: (result: ImageResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
  to: FormatId;
}

interface Slot {
  worker: Worker;
  /** Ids of the jobs this worker is running. */
  jobs: Set<number>;
}

let nextJob = 1;
const pending = new Map<number, Pending>();
const slots: Slot[] = [];
const preloads: PreloadRequest[] = [];

function startWorker(): Slot {
  const worker = new Worker(new URL("../../workers/image.worker.ts", import.meta.url), {
    type: "module",
  });
  const slot: Slot = { worker, jobs: new Set() };
  worker.onmessage = (event: MessageEvent<ImageWorkerMessage>) => {
    const msg = event.data;
    const job = pending.get(msg.id);
    if (!job) return;
    if (msg.type === "progress") {
      job.onProgress?.(msg.progress);
      return;
    }
    pending.delete(msg.id);
    slot.jobs.delete(msg.id);
    if (msg.type === "done") {
      job.onProgress?.(1);
      job.resolve({
        blob: new Blob([msg.buffer], { type: formats[job.to].mime }),
        width: msg.width,
        height: msg.height,
      });
    } else {
      job.reject(new Error(msg.message));
    }
  };
  worker.onerror = (event) => {
    // A crashed worker fails its jobs in flight; later calls start a new one.
    for (const id of slot.jobs) {
      pending.get(id)?.reject(new Error(event.message));
      pending.delete(id);
    }
    worker.terminate();
    slots.splice(slots.indexOf(slot), 1);
  };
  // A new worker loads the codecs already asked for.
  for (const request of preloads) worker.postMessage(request);
  slots.push(slot);
  return slot;
}

/**
 * Workers are reused across files and conversions. A batch spreads over up to
 * `deviceConcurrency()` of them (one per free core, fewer on low-memory
 * phones); beyond that, jobs queue on the least busy one.
 */
function pickWorker(): Slot {
  const idle = slots.find((slot) => slot.jobs.size === 0);
  if (idle) return idle;
  if (slots.length < deviceConcurrency()) return startWorker();
  return slots.reduce((a, b) => (b.jobs.size < a.jobs.size ? b : a));
}

const preloaded = new Set<string>();

/**
 * Starts a worker and loads the codecs for `from` → `to` in the background
 * (once per pair), so the first conversion doesn't wait for the download.
 */
export function preloadImageCodecs(from: FormatId | undefined, to: FormatId | undefined) {
  if (typeof Worker === "undefined" || (!from && !to)) return;
  const key = `${from ?? ""}>${to ?? ""}`;
  if (preloaded.has(key)) return;
  preloaded.add(key);
  const request: PreloadRequest = { type: "preload", from, to };
  preloads.push(request);
  if (slots.length === 0) startWorker();
  else for (const slot of slots) slot.worker.postMessage(request);
}

export function canConvertImageInBrowser(to: FormatId) {
  return browserImageOutputs.includes(to) && typeof Worker !== "undefined";
}

/**
 * Workers have no DOM to render SVG, so it is rasterized here, directly at
 * the requested size (vectors stay sharp when enlarged).
 */
async function rasterizeSvg(file: Blob, options: ImageOptions) {
  // A vector has no pixels to crop: "cover" just fits it into the box.
  const resize =
    options.resize?.mode === "cover"
      ? { mode: "fit" as const, width: options.resize.width, height: options.resize.height }
      : options.resize;
  const size = computeSize(svgIntrinsicSize(await file.text()), resize ?? { mode: "none" }, {
    upscale: true,
  });
  const url = URL.createObjectURL(new Blob([file], { type: "image/svg+xml" }));
  try {
    const img = new Image(size.width, size.height);
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.drawImage(img, 0, 0, size.width, size.height);
    return ctx.getImageData(0, 0, size.width, size.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function convertImage(
  file: Blob,
  from: FormatId,
  to: FormatId,
  options: ImageOptions = {},
  onProgress?: (progress: number) => void,
): Promise<ImageResult> {
  let job: Omit<ImageJob, "id">;
  if (from === "svg") {
    const raster = await rasterizeSvg(file, options);
    job = {
      buffer: raster.data.buffer as ArrayBuffer,
      pixels: { width: raster.width, height: raster.height },
      from,
      to,
      options: { ...options, resize: { mode: "none" } },
    };
  } else {
    job = { buffer: await file.arrayBuffer(), from, to, options };
  }
  const id = nextJob++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress, to });
    const slot = pickWorker();
    slot.jobs.add(id);
    slot.worker.postMessage({ ...job, id }, [job.buffer]);
  });
}
