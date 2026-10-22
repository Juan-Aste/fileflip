// Batch runner on top of the job pool: per-item results instead of failing
// the whole batch, a shared cancel signal and overall progress.

import { runLimited } from "@/lib/concurrency";
import { ConversionError, errorCode } from "@/lib/convert-error";
import type { ApiErrorCode } from "@/lib/api-errors";

export type BatchResult<R> =
  | { status: "done"; value: R }
  | { status: "error"; code: ApiErrorCode; error: unknown };

export interface BatchOptions {
  concurrency?: number;
  signal?: AbortSignal;
  /** Overall progress from 0 to 1 (average of the items). */
  onProgress?: (progress: number) => void;
  /** Called as soon as each item settles, in completion order. */
  onItem?: (index: number, result: BatchResult<unknown>) => void;
}

/**
 * Runs `task` over `items` with at most `concurrency` at once. Each item gets
 * its own progress callback; items not started when the signal aborts are
 * reported as `jobCancelled` without running.
 */
export async function runBatch<T, R>(
  items: readonly T[],
  task: (item: T, context: { index: number; signal?: AbortSignal; onProgress: (p: number) => void }) => Promise<R>,
  { concurrency = 1, signal, onProgress, onItem }: BatchOptions = {},
): Promise<BatchResult<R>[]> {
  const results: BatchResult<R>[] = new Array(items.length);
  const progress = new Array<number>(items.length).fill(0);
  const report = () => onProgress?.(items.length ? progress.reduce((a, b) => a + b, 0) / items.length : 1);

  await runLimited(items, concurrency, async (item, index) => {
    let result: BatchResult<R>;
    if (signal?.aborted) {
      const error = new ConversionError("jobCancelled");
      result = { status: "error", code: errorCode(error), error };
    } else {
      try {
        const value = await task(item, {
          index,
          signal,
          onProgress: (p) => {
            progress[index] = Math.min(1, Math.max(0, p));
            report();
          },
        });
        result = { status: "done", value };
      } catch (error) {
        result = { status: "error", code: errorCode(error), error };
      }
    }
    progress[index] = 1;
    results[index] = result;
    report();
    onItem?.(index, result);
  });
  return results;
}
