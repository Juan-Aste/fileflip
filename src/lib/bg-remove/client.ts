import type { FormatId } from "@/config/formats";
import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { Background } from "./mask";

// One worker (one model in memory), started the first time a photo is processed.
const pool = createJobPool(() => new Worker(new URL("../../workers/bg-remove.worker.ts", import.meta.url), { type: "module" }));

/** The photo without its background: a transparent PNG, or a JPG over a solid color. */
export const removeImageBackground = (input: Blob, from: FormatId, background: Background, job: JobOptions = {}) =>
  pool.run<{ buffer: ArrayBuffer; width: number; height: number }>("removeBackground", { input, from, background }, job);
