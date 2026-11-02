import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { Prepared } from "./cutout-client";

// MediaPipe runs in its own worker, started only when the "people" mode is
// chosen (the rectangle mode never downloads it).
const pool = createJobPool(() => new Worker(new URL("../../workers/people.worker.ts", import.meta.url), { type: "module" }));

/** Person probability (0–255) of the work copy; the copy is copied, not transferred. */
export const findPerson = (p: Prepared, job: JobOptions = {}) =>
  pool.run<{ prob: ArrayBuffer }>("segment", { work: p.work, workWidth: p.workWidth, workHeight: p.workHeight }, job);
