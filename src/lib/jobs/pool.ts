// Generic job engine for tools that run in Web Workers. Each job runs on a
// pooled worker speaking the `worker-rpc` protocol; a job that is cancelled
// or exceeds its time limit terminates its worker (the only way to stop code
// stuck in a library), and the pool starts a fresh one for the next job.

import { ConversionError } from "@/lib/convert-error";

/** The part of `Worker` the pool uses, so tests can pass a fake. */
export interface WorkerLike {
  postMessage(message: unknown, transfer: Transferable[]): void;
  terminate(): void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

type Message =
  | { id: number; type: "progress"; progress: number }
  | { id: number; type: "done"; result: unknown }
  | { id: number; type: "error"; message: string };

export interface JobOptions {
  transfer?: Transferable[];
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
  /** Terminates the worker and fails with `jobTimedOut` after this long. */
  timeoutMs?: number;
}

export interface JobPool {
  run<T>(method: string, args: unknown, options?: JobOptions): Promise<T>;
  /** Workers alive right now (idle or busy). */
  size(): number;
  /** Terminates every worker and fails the jobs waiting or running. */
  dispose(): void;
}

interface Queued {
  method: string;
  args: unknown;
  options: JobOptions;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface Slot {
  worker: WorkerLike;
  job: (Queued & { id: number; finish: (error?: Error, value?: unknown) => void }) | null;
}

/**
 * A pool of up to `concurrency` workers, started lazily and reused while
 * idle. Jobs beyond that wait in order. Errors thrown in the worker reject
 * with their message; cancellation and timeouts reject with a
 * `ConversionError` (`jobCancelled` / `jobTimedOut`) the UI can translate.
 */
export function createJobPool(start: () => WorkerLike, { concurrency = 1 }: { concurrency?: number } = {}): JobPool {
  const limit = Math.max(1, concurrency);
  const slots: Slot[] = [];
  const queue: Queued[] = [];
  let nextId = 1;

  function retire(slot: Slot) {
    slot.worker.onmessage = null;
    slot.worker.onerror = null;
    slot.worker.terminate();
    slots.splice(slots.indexOf(slot), 1);
  }

  function spawn(): Slot {
    const slot: Slot = { worker: start(), job: null };
    slot.worker.onmessage = (event: MessageEvent<Message>) => {
      const msg = event.data;
      const job = slot.job;
      if (!job || msg.id !== job.id) return;
      if (msg.type === "progress") job.options.onProgress?.(msg.progress);
      else if (msg.type === "done") job.finish(undefined, msg.result);
      else job.finish(new Error(msg.message));
    };
    slot.worker.onerror = (event) => {
      event.preventDefault?.();
      const job = slot.job;
      retire(slot);
      job?.finish(new Error(event.message || "Worker crashed"), undefined);
      pump();
    };
    slots.push(slot);
    return slot;
  }

  function pump() {
    while (queue.length > 0) {
      const slot = slots.find((s) => !s.job) ?? (slots.length < limit ? spawn() : null);
      if (!slot) return;
      dispatch(slot, queue.shift()!);
    }
  }

  function dispatch(slot: Slot, queued: Queued) {
    const id = nextId++;
    const { signal, timeoutMs } = queued.options;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => {
      // The worker may be deep inside a library call: only terminating stops it.
      retire(slot);
      finish(new ConversionError("jobCancelled"));
      pump();
    };
    function finish(error?: Error, value?: unknown) {
      if (slot.job?.id !== id) return;
      slot.job = null;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (error) queued.reject(error);
      else {
        queued.options.onProgress?.(1);
        queued.resolve(value);
      }
      pump();
    }
    slot.job = { ...queued, id, finish };
    signal?.addEventListener("abort", onAbort, { once: true });
    if (timeoutMs && timeoutMs > 0) {
      timer = setTimeout(() => {
        retire(slot);
        finish(new ConversionError("jobTimedOut"));
      }, timeoutMs);
    }
    slot.worker.postMessage({ id, method: queued.method, args: queued.args }, queued.options.transfer ?? []);
  }

  return {
    run<T>(method: string, args: unknown, options: JobOptions = {}) {
      return new Promise<T>((resolve, reject) => {
        if (options.signal?.aborted) return reject(new ConversionError("jobCancelled"));
        const queued: Queued = { method, args, options, resolve: resolve as (v: unknown) => void, reject };
        // A job cancelled while still waiting just leaves the queue.
        options.signal?.addEventListener(
          "abort",
          () => {
            const index = queue.indexOf(queued);
            if (index === -1) return;
            queue.splice(index, 1);
            reject(new ConversionError("jobCancelled"));
          },
          { once: true },
        );
        queue.push(queued);
        pump();
      });
    },
    size: () => slots.length,
    dispose() {
      for (const queued of queue.splice(0)) queued.reject(new ConversionError("jobCancelled"));
      for (const slot of [...slots]) {
        const job = slot.job;
        retire(slot);
        job?.finish(new ConversionError("jobCancelled"));
      }
    },
  };
}
