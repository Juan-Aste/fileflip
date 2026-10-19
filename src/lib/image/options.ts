// Lightweight image settings shared by the UI and the worker. Kept apart from
// codecs.ts so the main bundle never references the WASM codec chunks.
import type { FormatId } from "@/config/formats";
import type { Resize } from "./dimensions";

export interface EncodeOptions {
  /** 1–100; ignored by lossless formats. */
  quality?: number;
}

export interface ImageOptions extends EncodeOptions {
  resize?: Resize;
}

export const DEFAULT_QUALITY = 82;

/** Formats where the quality setting matters. */
export const lossyFormats: readonly FormatId[] = ["jpg", "webp", "avif"];

/** Formats the image worker can encode. */
export const browserImageOutputs: readonly FormatId[] = [
  "jpg",
  "png",
  "webp",
  "avif",
  "gif",
  "bmp",
  "tiff",
  "ico",
];
