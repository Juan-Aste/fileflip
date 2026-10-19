"use client";

import { formats, type FormatId } from "@/config/formats";
import type { ImageJob, ImageWorkerMessage } from "@/workers/protocol";
import { encoders, type EncodeOptions } from "./codecs";

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
  return to in encoders && typeof Worker !== "undefined";
}

export async function convertImage(
  file: Blob,
  from: FormatId,
  to: FormatId,
  options: EncodeOptions = {},
  onProgress?: (progress: number) => void,
): Promise<ImageResult> {
  const buffer = await file.arrayBuffer();
  const id = nextJob++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress, to });
    const job: ImageJob = { id, buffer, from, to, options };
    getWorker().postMessage(job, [buffer]);
  });
}
