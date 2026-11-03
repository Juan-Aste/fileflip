import { ConversionError } from "@/lib/convert-error";
import { createJobPool } from "@/lib/jobs";
import type { LegacyKind } from "./options";

// One worker (one FFmpeg core in memory), started the first time an old file is converted.
const pool = createJobPool(() => new Worker(new URL("../../workers/legacy-media.worker.ts", import.meta.url), { type: "module" }));

// A trim tool reads the duration first and converts afterwards: the rewritten file is reused.
const cache = new WeakMap<Blob, Map<LegacyKind, Promise<Blob>>>();

/**
 * The file rewritten by FFmpeg (WASM) into a format mediabunny reads: WebM
 * (VP8 + Opus) for video, WAV for audio. Cancelling stops the worker.
 */
export function transcodeLegacy(file: Blob, kind: LegacyKind, { signal, onProgress }: { signal?: AbortSignal; onProgress?: (p: number) => void } = {}): Promise<Blob> {
  const byKind = cache.get(file) ?? new Map<LegacyKind, Promise<Blob>>();
  cache.set(file, byKind);
  const known = byKind.get(kind);
  if (known) return known;
  const job = pool
    .run<{ buffer: ArrayBuffer }>("transcode", { file, kind }, { signal, onProgress })
    .then(({ buffer }) => new Blob([buffer], { type: kind === "video" ? "video/webm" : "audio/wav" }));
  byKind.set(kind, job);
  // Failures (and cancellations) are not kept: trying again converts again.
  job.catch(() => byKind.delete(kind));
  return job;
}

export { ConversionError };
