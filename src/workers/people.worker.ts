/// <reference lib="webworker" />
import { loadSegmenter, segmentWith } from "@/lib/bg-remove/people-engine";
import { exposeHandlers } from "@/lib/worker-rpc";

// "People" mode of background removal: MediaPipe Selfie Segmenter on the
// reduced copy of the photo (see people-engine.ts). Only started when the user
// opens a photo in that mode, so the engine (~4 MB) is never downloaded
// otherwise. Everything comes from our domain; the photo never leaves the device.

let segmenter: ReturnType<typeof loadSegmenter> | null = null;

/** Downloads and starts the engine and the model (once per worker). */
async function prepare() {
  if (!segmenter) {
    segmenter = loadSegmenter();
    // A failed start (offline, say) can be retried on the next call.
    segmenter.catch(() => (segmenter = null));
  }
  await segmenter;
  return { result: null };
}

/** Work copy (RGBA) → person probability, 0–255, same size. */
async function segment({ work, workWidth, workHeight }: { work: ArrayBuffer; workWidth: number; workHeight: number }) {
  await prepare();
  const prob = segmentWith(await segmenter!, work, workWidth, workHeight);
  return { result: { prob: prob.buffer }, transfer: [prob.buffer as ArrayBuffer] };
}

exposeHandlers({ prepare, segment });
