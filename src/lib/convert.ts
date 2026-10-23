"use client";

import {
  findConversion,
  formats,
  type Conversion,
  type FormatId,
} from "@/config/formats";
import { limits, type Plan } from "@/config/limits";
import { canConvertDocumentOnServer, canConvertImageOnServer } from "@/config/server-capabilities";
import { browserSupportsImaging, currentDeviceBudget } from "./capabilities";
import { ConversionError } from "./convert-error";
import { canConvertImageInBrowser, convertImage } from "./image/client";
import { isDamagedImage } from "./image/integrity";
import type { ImageOptions } from "./image/options";
import { convertOnServer } from "./server-client";

export interface ConvertOptions extends ImageOptions {
  onProgress?: (progress: number) => void;
  /** The user's plan decides size limits (enforced again by the server). */
  plan?: Plan;
}

export interface ConvertResult {
  blob: Blob;
  /** Overrides the default output name (e.g. a ZIP of PDF pages). */
  filename?: string;
  /** Where it actually ran (browser conversions may fall back to the server). */
  engine: "browser" | "server";
}

/** Whether this build can run a conversion yet (formats are enabled as engines land). */
export function isRunnable(conversion: Conversion): boolean {
  if (conversion.to === "pdf" && formats[conversion.from].category === "image")
    return true;
  if (
    conversion.from === "pdf" &&
    (conversion.to === "jpg" || conversion.to === "png")
  )
    return true;
  if (conversion.engine === "browser") {
    return (
      canConvertImageInBrowser(conversion.to) ||
      canConvertImageOnServer(conversion.from, conversion.to)
    );
  }
  return canConvertDocumentOnServer(conversion.from, conversion.to);
}

/**
 * Converts one file. Browser conversions run locally when the device can
 * handle them and fall back to the server automatically otherwise.
 */
export async function convertFile(
  file: Blob,
  from: FormatId,
  to: FormatId,
  { onProgress, plan = "free", ...options }: ConvertOptions = {},
): Promise<ConvertResult> {
  const limit = limits[plan];
  const conversion = findConversion(from, to);
  if (!conversion || !isRunnable(conversion))
    throw new ConversionError("unsupportedFormat");

  // Cut or damaged JPEG/PNG: lenient decoders would hide it (or the server
  // would get a useless upload), so stop here with a clear message.
  if ((from === "jpg" || from === "png") && isDamagedImage(new Uint8Array(await file.arrayBuffer()), from))
    throw new ConversionError("fileDamaged");

  if (to === "pdf" && formats[from].category === "image") {
    const { imagesToPdfFile } = await import("./pdf/client");
    return {
      blob: await imagesToPdfFile([{ file, format: from }], {}, onProgress),
      engine: "browser",
    };
  }

  if (from === "pdf" && (to === "jpg" || to === "png"))
    return pdfPagesToImages(file, to, options, onProgress);

  if (conversion.engine === "server") {
    if (file.size > limit.serverMaxFileBytes) {
      throw new ConversionError("fileTooLarge");
    }
    return {
      blob: await convertOnServer("/api/convert/document", file, to, {}, onProgress),
      engine: "server",
    };
  }

  const serverOk = canConvertImageOnServer(from, to) && file.size <= limit.serverMaxFileBytes;
  const server = async (): Promise<ConvertResult> => ({
    blob: await convertOnServer(
      "/api/convert/image",
      file,
      to,
      options,
      onProgress,
    ),
    engine: "server",
  });

  const localOk =
    canConvertImageInBrowser(to) &&
    browserSupportsImaging() &&
    file.size <= currentDeviceBudget();
  if (!localOk) {
    if (serverOk) return server();
    throw new ConversionError(
      file.size > currentDeviceBudget() ? "fileTooLarge" : "browserUnsupported",
    );
  }

  try {
    const { blob } = await convertImage(file, from, to, options, onProgress);
    return { blob, engine: "browser" };
  } catch (error) {
    // Out of memory, missing codec support, corrupt decode...: let the server try.
    if (serverOk) {
      console.warn(
        "Local conversion failed, falling back to the server",
        error,
      );
      return server();
    }
    throw error;
  }
}

/** One image per page; several pages come back as a ZIP. */
async function pdfPagesToImages(
  file: Blob,
  to: "jpg" | "png",
  options: ImageOptions,
  onProgress?: (progress: number) => void,
): Promise<ConvertResult> {
  const { pdfToImages, pageImageName } = await import("./pdf/to-images");
  const name = (file as File).name ?? "document.pdf";
  const pages = await pdfToImages(file, to, options, (p) =>
    onProgress?.(p * 0.95),
  );
  if (pages.length === 1) return { blob: pages[0].blob, engine: "browser" };
  const { zipBlobs } = await import("./zip");
  const zip = await zipBlobs(
    pages.map((p) => ({
      blob: p.blob,
      name: pageImageName(name, p.page, pages.length, to),
    })),
  );
  return {
    blob: zip,
    engine: "browser",
    filename: (name.replace(/\.[^.]+$/, "") || "document") + `-${to}.zip`,
  };
}
