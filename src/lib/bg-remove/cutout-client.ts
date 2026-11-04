import type { FormatId } from "@/config/formats";
import { createJobPool, type JobOptions } from "@/lib/jobs";
import type { Background } from "./cutout";
import type { Rect, Stroke } from "./grabcut";
import type { PaintStroke } from "./paint";

// One worker, started when the first photo is opened.
const pool = createJobPool(() => new Worker(new URL("../../workers/cutout.worker.ts", import.meta.url), { type: "module" }));

export type Prepared = {
  width: number;
  height: number;
  /** Reduced copy GrabCut works on (RGBA). */
  workWidth: number;
  workHeight: number;
  work: ArrayBuffer;
  /** Larger copy shown in the zoomable editor (RGBA, up to VIEW_MAX_PIXELS). */
  viewWidth: number;
  viewHeight: number;
  view: ArrayBuffer;
};

export const preparePhoto = (input: Blob, from: FormatId, job: JobOptions = {}) => pool.run<Prepared>("prepare", { input, from }, job);

/** The work copy is copied (not transferred): the page keeps it for the next cut. */
export const cutPhoto = (p: Prepared, rect: Rect, strokes: readonly Stroke[], job: JobOptions = {}) =>
  pool.run<{ mask: ArrayBuffer }>("cut", { work: p.work, workWidth: p.workWidth, workHeight: p.workHeight, rect, strokes }, job);

/** "People" mode: the cut starts from the person probability (0–255, work size) instead of a rectangle. */
export const cutPerson = (p: Prepared, prob: Uint8Array, strokes: readonly Stroke[], job: JobOptions = {}) =>
  pool.run<{ mask: ArrayBuffer }>("cutPerson", { work: p.work, workWidth: p.workWidth, workHeight: p.workHeight, prob: prob.buffer, strokes }, job);

export const exportPhoto = (
  input: Blob,
  from: FormatId,
  mask: Uint8Array,
  p: Prepared,
  background: Background,
  to: "png" | "jpg" | "webp",
  paint: readonly PaintStroke[],
  job: JobOptions = {},
) =>
  pool.run<{ buffer: ArrayBuffer; width: number; height: number }>(
    "exportImage",
    { input, from, mask: mask.buffer, maskWidth: p.workWidth, maskHeight: p.workHeight, background, to, quality: 90, paint },
    job,
  );
