// Settings of the "fake transparency" fix shared by the page and its worker.
import type { FormatId } from "@/config/formats";

/** Formats with alpha the fix can deliver; anything else gets PNG. */
export const fakeBgOutputs = ["png", "webp", "avif"] as const;
export type FakeBgOutput = (typeof fakeBgOutputs)[number];

/** The format the user picked when it keeps transparency, else PNG. */
export function fakeBgOutput(picked: FormatId | null | undefined): FakeBgOutput {
  return (fakeBgOutputs as readonly string[]).includes(picked ?? "") ? (picked as FakeBgOutput) : "png";
}

/** Raster formats worth checking (decoded whole: big ones are skipped). */
export const fakeBgInputs: readonly FormatId[] = ["jpg", "png", "webp", "avif", "bmp", "gif", "tiff", "heic"];
export const FAKE_BG_MAX_PIXELS = 40_000_000;
/** Skip the automatic check for files above this (the fix still works on demand). */
export const FAKE_BG_DETECT_MAX_BYTES = 30 * 1024 * 1024;
export const FAKE_BG_QUALITY = 90;
