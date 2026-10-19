"use client";

import { formats, type FormatId } from "@/config/formats";
import type { ImageJob, ImageWorkerMessage } from "@/workers/protocol";
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

let worker: Worker | null = null;
let nextJob = 1;
const pending = new Map<number, Pending>();

/** One shared worker: jobs queue there and the UI thread never blocks. */
function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("../../workers/image.worker.ts", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (event: MessageEvent<ImageWorkerMessage>) => {
    const msg = event.data;
    const job = pending.get(msg.id);
    if (!job) return;
    if (msg.type === "progress") {
      job.onProgress?.(msg.progress);
      return;
    }
    pending.delete(msg.id);
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
    // A crashed worker fails every job in flight; the next call starts a new one.
    for (const job of pending.values()) job.reject(new Error(event.message));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
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
    getWorker().postMessage({ ...job, id }, [job.buffer]);
  });
}
