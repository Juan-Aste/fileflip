// Sentence audio generated ahead of playback (task 13.1). While one sentence
// plays, the next `ahead` are requested, with at most `concurrency` being
// generated at once (1 for the in-browser voice, whose worker is serial; a
// few for a cloud voice). Each sentence is generated once per settings key
// (voice, speed…): asking again returns the same promise. Moving the window
// (seek) drops what fell out of it, and `reset` (new voice, speed or text)
// drops everything; both abort requests that had not finished, so no work is
// done for audio nobody will hear. A request that is already running gets its
// signal aborted; the generator decides whether it can stop (a fetch can, a
// model call in a worker just finishes and is discarded).

export interface PrefetchQueue<T> {
  /**
   * Audio for sentence `index`. Also requests `index + 1 … index + ahead` and
   * forgets (aborting) the sentences outside that window.
   */
  get(index: number): Promise<T>;
  /** Aborts and forgets everything (settings changed). */
  reset(): void;
  /** Requests started so far (for tests and measurements). */
  readonly started: number;
}

export interface PrefetchOptions<T> {
  generate: (index: number, signal: AbortSignal) => Promise<T>;
  /** Sentences prepared after the one playing. */
  ahead?: number;
  /** Requests running at the same time. */
  concurrency?: number;
  /** Sentences kept behind the one playing (to replay the previous one quickly). */
  behind?: number;
  /** Number of sentences: nothing past the last one is requested. */
  count: () => number;
}

interface Entry<T> {
  index: number;
  promise: Promise<T>;
  controller: AbortController;
  /** Runs the generator; null once started. */
  run: (() => void) | null;
  settled: boolean;
}

export function createPrefetchQueue<T>({ generate, ahead = 3, concurrency = 1, behind = 1, count }: PrefetchOptions<T>): PrefetchQueue<T> {
  const limit = Math.max(1, concurrency);
  let entries = new Map<number, Entry<T>>();
  let running = 0;
  let started = 0;

  // While the window moves nothing starts, so a dropped request's slot is not
  // handed to another sentence that is about to be dropped too.
  let moving = false;

  function pump() {
    if (moving) return;
    // Lowest index first: the sentence about to play beats the ones after it.
    const waiting = [...entries.values()].filter((e) => e.run).sort((a, b) => a.index - b.index);
    for (const entry of waiting) {
      if (running >= limit) return;
      const run = entry.run!;
      entry.run = null;
      run();
    }
  }

  function drop(entry: Entry<T>) {
    entries.delete(entry.index);
    if (!entry.settled) entry.controller.abort();
  }

  function request(index: number): Promise<T> {
    const existing = entries.get(index);
    if (existing) return existing.promise;
    const controller = new AbortController();
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    // Nobody may be waiting on a prefetched sentence: avoid unhandled rejections.
    promise.catch(() => {});
    const map = entries;
    const entry: Entry<T> = { index, promise, controller, settled: false, run: null };
    entry.run = () => {
      running++;
      started++;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        running--;
        entry.settled = true;
        controller.signal.removeEventListener("abort", onAbort);
        pump();
      };
      // An aborted request frees its slot at once, even if the generator keeps going.
      const onAbort = () => {
        finish();
        reject(new DOMException("Aborted", "AbortError"));
      };
      controller.signal.addEventListener("abort", onAbort, { once: true });
      generate(index, controller.signal).then(
        (value) => {
          finish();
          resolve(value);
        },
        (error) => {
          finish();
          // A failed sentence is asked again next time instead of failing forever.
          if (map.get(index) === entry) map.delete(index);
          reject(error);
        },
      );
    };
    controller.signal.addEventListener(
      "abort",
      () => {
        if (!entry.run) return;
        entry.run = null;
        entry.settled = true;
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
    entries.set(index, entry);
    return promise;
  }

  return {
    get(index) {
      moving = true;
      for (const entry of [...entries.values()]) {
        if (entry.index < index - behind || entry.index > index + ahead) drop(entry);
      }
      const audio = request(index);
      for (let i = index + 1; i <= Math.min(index + ahead, count() - 1); i++) void request(i);
      moving = false;
      pump();
      return audio;
    },
    reset() {
      const old = entries;
      entries = new Map();
      moving = true;
      for (const entry of old.values()) if (!entry.settled) entry.controller.abort();
      moving = false;
    },
    get started() {
      return started;
    },
  };
}
