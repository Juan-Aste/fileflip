import type { JobState } from "./useFileQueue";

export interface QueueSummary {
  /** Files with a conversion started in the last run (working, done or failed). */
  total: number;
  working: number;
  done: number;
  errors: number;
  /** Overall progress of the run, 0–1 (finished jobs count as 1). */
  progress: number;
  state: "idle" | "working" | "done" | "error";
}

/** Status of the conversion run shown above the file list. */
export function queueSummary(items: readonly { job?: JobState }[]): QueueSummary {
  let working = 0;
  let done = 0;
  let errors = 0;
  let sum = 0;
  for (const { job } of items) {
    if (!job) continue;
    if (job.status === "working") {
      working++;
      sum += Math.min(1, Math.max(0, job.progress));
    } else {
      sum += 1;
      if (job.status === "done") done++;
      else errors++;
    }
  }
  const total = working + done + errors;
  const state =
    total === 0 ? "idle" : working > 0 ? "working" : errors > 0 ? "error" : "done";
  return { total, working, done, errors, progress: total ? sum / total : 0, state };
}
