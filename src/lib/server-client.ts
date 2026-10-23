"use client";

import type { FormatId } from "@/config/formats";
import { isApiErrorCode, type ApiErrorCode } from "./api-errors";
import { ConversionError, isLoggedByServerCode } from "./convert-error";
import type { ImageOptions } from "./image/options";

/**
 * Uploads a file to a conversion endpoint. XHR (not fetch) because it reports
 * upload progress: 0–70 % uploading, 70–100 % downloading the result.
 */
export function convertOnServer(
  endpoint: string,
  file: Blob,
  to: FormatId,
  options: ImageOptions | Record<string, unknown>,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const form = new FormData();
  form.append("file", file, (file as File).name ?? "file");
  form.append("to", to);
  form.append("options", JSON.stringify(options));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.responseType = "blob";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.((e.loaded / e.total) * 0.7);
    xhr.onprogress = (e) => e.lengthComputable && onProgress?.(0.7 + (e.loaded / e.total) * 0.3);
    xhr.onerror = () => reject(new ConversionError(navigator.onLine === false ? "connectionLost" : "serviceUnavailable"));
    xhr.onabort = () => reject(new ConversionError("jobCancelled"));
    if (signal?.aborted) return reject(new ConversionError("jobCancelled"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as Blob);
        return;
      }
      let code: unknown = statusCode(xhr.status);
      try {
        code = JSON.parse(await (xhr.response as Blob).text()).error ?? code;
      } catch {
        // Non-JSON error page (proxy, crash): the code the status implies.
      }
      const known = isApiErrorCode(code) ? code : "conversionFailed";
      reject(new ConversionError(known, isLoggedByServerCode(known)));
    };
    xhr.send(form);
  });
}

/**
 * The code for an error answer without our JSON body: the hosting proxy's own
 * pages for a body over its limit (413) or an app that is down or restarting
 * (502–504) say so instead of blaming the file (bug B-09).
 */
export function statusCode(status: number): ApiErrorCode {
  if (status === 429) return "rateLimited";
  if (status === 413) return "fileTooLarge";
  if (status >= 502 && status <= 504) return "serviceUnavailable";
  return "conversionFailed";
}
