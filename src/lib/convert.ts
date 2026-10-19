"use client";

import { findConversion, type Conversion, type FormatId } from "@/config/formats";
import type { ImageOptions } from "@/lib/image/options";
import { canConvertImageInBrowser, convertImage } from "@/lib/image/client";

export interface ConvertOptions extends ImageOptions {
  onProgress?: (progress: number) => void;
}

/** Whether this build can run a conversion yet (formats are enabled as engines land). */
export function isRunnable(conversion: Conversion): boolean {
  if (conversion.engine === "browser") {
    return canConvertImageInBrowser(conversion.to);
  }
  return false;
}

/** Converts one file, choosing the engine registered for the conversion. */
export async function convertFile(
  file: Blob,
  from: FormatId,
  to: FormatId,
  { onProgress, ...options }: ConvertOptions = {},
): Promise<Blob> {
  const conversion = findConversion(from, to);
  if (!conversion || !isRunnable(conversion)) {
    throw new Error(`Unsupported conversion ${from} → ${to}`);
  }
  const { blob } = await convertImage(file, from, to, options, onProgress);
  return blob;
}
