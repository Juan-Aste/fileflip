import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { Prepared } from "./cutout-client";
import { loadSegmenter, segmentWith, webglSupport } from "./people-engine";

// MediaPipe runs in its own worker, started only when a photo is opened in the
// "people" mode (the rectangle mode never downloads it). Browsers without WebGL
// on an OffscreenCanvas (older Safari, WebKitGTK) run it on the main thread
// with a <canvas>: one short pass on a ≤ 480 px copy. Without WebGL at all
// MediaPipe cannot run, so nothing is downloaded and the page says why.
const pool = createJobPool(() => new Worker(new URL("../../workers/people.worker.ts", import.meta.url), { type: "module" }));

/** The browser has no WebGL (turned off, say): the automatic mode cannot run. */
export class NoWebglError extends Error {
  constructor() {
    super("WebGL is not available");
    this.name = "NoWebglError";
  }
}

let mainThread: ReturnType<typeof loadSegmenter> | null = null;

/** Person probability (0–255) of the work copy; the copy is copied, not transferred. */
export async function findPerson(p: Prepared, job: JobOptions = {}): Promise<{ prob: ArrayBuffer }> {
  const support = webglSupport();
  if (support === "none") throw new NoWebglError();
  if (support === "worker") return pool.run<{ prob: ArrayBuffer }>("segment", { work: p.work, workWidth: p.workWidth, workHeight: p.workHeight }, job);
  if (!mainThread) {
    mainThread = loadSegmenter(document.createElement("canvas"));
    mainThread.catch(() => (mainThread = null));
  }
  const segmenter = await mainThread;
  if (job.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return { prob: segmentWith(segmenter, p.work, p.workWidth, p.workHeight).buffer as ArrayBuffer };
}
