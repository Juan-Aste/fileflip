"use client";

import { findConversion, formats, type Conversion, type FormatId } from "@/config/formats";
import { limits } from "@/config/limits";
import { canConvertImageOnServer } from "@/config/server-capabilities";
import { browserSupportsImaging, currentDeviceBudget } from "./capabilities";
import { ConversionError } from "./convert-error";
import { canConvertImageInBrowser, convertImage } from "./image/client";
import type { ImageOptions } from "./image/options";
import { convertOnServer } from "./server-client";

export interface ConvertOptions extends ImageOptions {
  onProgress?: (progress: number) => void;
}

export interface ConvertResult {
  blob: Blob;
  /** Where it actually ran (browser conversions may fall back to the server). */
  engine: "browser" | "server";
}

/** Whether this build can run a conversion yet (formats are enabled as engines land). */
export function isRunnable(conversion: Conversion): boolean {
  if (conversion.to === "pdf" && formats[conversion.from].category === "image") return true;
  if (conversion.engine === "browser") {
    return (
      canConvertImageInBrowser(conversion.to) ||
      canConvertImageOnServer(conversion.from, conversion.to)
    );
  }
  return false;
}

/**
 * Converts one file. Browser conversions run locally when the device can
 * handle them and fall back to the server automatically otherwise.
 */
export async function convertFile(
  file: Blob,
  from: FormatId,
  to: FormatId,
  { onProgress, ...options }: ConvertOptions = {},
): Promise<ConvertResult> {
  const conversion = findConversion(from, to);
  if (!conversion || !isRunnable(conversion)) throw new ConversionError("unsupportedFormat");

  if (to === "pdf" && formats[from].category === "image") {
    const { imagesToPdfFile } = await import("./pdf/client");
    return { blob: await imagesToPdfFile([{ file, format: from }], {}, onProgress), engine: "browser" };
  }

  // TODO(5.7): use the signed-in user's plan.
  const serverOk =
    canConvertImageOnServer(from, to) && file.size <= limits.free.serverMaxFileBytes;
  const server = async (): Promise<ConvertResult> => ({
    blob: await convertOnServer("/api/convert/image", file, to, options, onProgress),
    engine: "server",
  });

  const localOk =
    canConvertImageInBrowser(to) && browserSupportsImaging() && file.size <= currentDeviceBudget();
  if (!localOk) {
    if (serverOk) return server();
    throw new ConversionError(file.size > currentDeviceBudget() ? "fileTooLarge" : "browserUnsupported");
  }

  try {
    const { blob } = await convertImage(file, from, to, options, onProgress);
    return { blob, engine: "browser" };
  } catch (error) {
    // Out of memory, missing codec support, corrupt decode...: let the server try.
    if (serverOk) {
      console.warn("Local conversion failed, falling back to the server", error);
      return server();
    }
    throw error;
  }
}
