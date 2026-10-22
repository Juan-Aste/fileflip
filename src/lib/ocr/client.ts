"use client";

import type { LoggerMessage, Worker as TesseractWorker } from "tesseract.js";
import { ConversionError } from "@/lib/convert-error";
import { detectFileFormat } from "@/lib/detect";
import { convertImage } from "@/lib/image/client";
import { ocrAssets } from "./assets";
import { cleanOcrText, ocrSize, tesseractLanguage, type OcrLanguage } from "./text";

// OCR with tesseract.js, all on the user's device: the engine, its WASM core
// and the language model come from our own domain (/ocr, see assets.ts), and
// only the chosen language is downloaded (then cached by the browser).

export interface OcrResult {
  text: string;
  /** Tesseract's mean word confidence, 0–100. */
  confidence: number;
}

export interface OcrSession {
  recognize: (image: Blob, options: { signal?: AbortSignal; onProgress?: (p: number) => void }) => Promise<OcrResult>;
  terminate: () => Promise<void>;
}

/** Formats the browser can't decode itself go through the image worker first. */
const viaImageWorker = new Set(["tiff", "heic"]);

/** The image as a PNG at the size tesseract reads best (EXIF orientation applied). */
export async function prepareOcrImage(file: Blob): Promise<Blob> {
  let source: Blob = file;
  const format = await detectFileFormat(file);
  if (format && viaImageWorker.has(format)) source = (await convertImage(file, format, "png")).blob;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new ConversionError("fileDamaged");
  }
  try {
    const size = ocrSize(bitmap.width, bitmap.height);
    const canvas = new OffscreenCanvas(size.width, size.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ConversionError("browserUnsupported");
    // A white page under transparent images: tesseract reads dark text on light.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    return await canvas.convertToBlob({ type: "image/png" });
  } finally {
    bitmap.close();
  }
}

/** Starts tesseract for one language; recognize images one after another, then terminate. */
export async function createOcrSession(language: OcrLanguage, signal?: AbortSignal): Promise<OcrSession> {
  let report: ((p: number) => void) | undefined;
  const logger = (m: LoggerMessage) => {
    // Loading the model is the first third, recognizing the rest.
    if (m.status === "recognizing text") report?.(0.3 + 0.7 * m.progress);
    else if (m.status.startsWith("loading")) report?.(0.3 * m.progress);
  };
  const { createWorker, OEM } = await import("tesseract.js");
  const starting = createWorker(tesseractLanguage[language], OEM.LSTM_ONLY, {
    workerPath: ocrAssets.worker,
    corePath: ocrAssets.core,
    langPath: ocrAssets.lang,
    workerBlobURL: false,
    logger,
    errorHandler: () => {},
  });
  // Cancelled while loading: stop the engine once it is up.
  const worker: TesseractWorker = await abortable(starting, signal, () => void starting.then((w) => w.terminate(), () => {}));
  // Images rarely carry a real resolution; 300 dpi is what the models expect.
  await worker.setParameters({ user_defined_dpi: "300" });
  return {
    async recognize(image, { signal: jobSignal, onProgress }) {
      report = onProgress;
      try {
        const { data } = await abortable(worker.recognize(image), jobSignal, () => void worker.terminate());
        return { text: cleanOcrText(data.text, language), confidence: Math.round(data.confidence) };
      } finally {
        report = undefined;
      }
    },
    terminate: () => worker.terminate().then(() => undefined),
  };
}

const stopped = (signal: AbortSignal) =>
  new ConversionError((signal.reason as Error | undefined)?.name === "TimeoutError" ? "jobTimedOut" : "jobCancelled");

/** Rejects with `jobCancelled` (or `jobTimedOut`) when the signal aborts (and runs `onAbort` to stop the work). */
function abortable<T>(promise: Promise<T>, signal: AbortSignal | undefined, onAbort?: () => void): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    onAbort?.();
    return Promise.reject(stopped(signal));
  }
  return new Promise((resolve, reject) => {
    const abort = () => {
      onAbort?.();
      reject(stopped(signal));
    };
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}
