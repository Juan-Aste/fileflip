import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { CompressArgs, CompressResult, ResizeArgs, ResizeResult } from "@/workers/image-tools.worker";

// One worker for the image tools (compress, resize...), started on first use. Photos
// are decoded whole, so jobs run one at a time to keep memory in check.
const IMAGE_TOOL_TIMEOUT_MS = 5 * 60_000;
const pool = createJobPool(
  () => new Worker(new URL("../../workers/image-tools.worker.ts", import.meta.url), { type: "module" }),
);

export const compressImageFile = (args: CompressArgs, job: JobOptions = {}) =>
  pool.run<CompressResult>("compress", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });

export const resizeImageFile = (args: ResizeArgs, job: JobOptions = {}) =>
  pool.run<ResizeResult>("resize", args, { timeoutMs: IMAGE_TOOL_TIMEOUT_MS, ...job });
