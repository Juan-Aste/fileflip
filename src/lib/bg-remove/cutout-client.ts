import type { FormatId } from "@/config/formats";
import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { Background } from "./cutout";
import type { Rect, Stroke } from "./grabcut";

// One worker, started when the first photo is opened.
const pool = createJobPool(() => new Worker(new URL("../../workers/cutout.worker.ts", import.meta.url), { type: "module" }));

export type Prepared = { width: number; height: number; workWidth: number; workHeight: number; work: ArrayBuffer };

export const preparePhoto = (input: Blob, from: FormatId, job: JobOptions = {}) => pool.run<Prepared>("prepare", { input, from }, job);

/** The work copy is copied (not transferred): the page keeps it for the next cut. */
export const cutPhoto = (p: Prepared, rect: Rect, strokes: readonly Stroke[], job: JobOptions = {}) =>
  pool.run<{ mask: ArrayBuffer }>("cut", { work: p.work, workWidth: p.workWidth, workHeight: p.workHeight, rect, strokes }, job);

export const exportPhoto = (
  input: Blob,
  from: FormatId,
  mask: Uint8Array,
  p: Prepared,
  background: Background,
  to: "png" | "jpg" | "webp",
  job: JobOptions = {},
) =>
  pool.run<{ buffer: ArrayBuffer; width: number; height: number }>(
    "exportImage",
    { input, from, mask: mask.buffer, maskWidth: p.workWidth, maskHeight: p.workHeight, background, to, quality: 90 },
    job,
  );
