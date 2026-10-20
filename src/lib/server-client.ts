"use client";

import type { FormatId } from "@/config/formats";
import { isApiErrorCode } from "./api-errors";
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
  options: ImageOptions,
  onProgress?: (progress: number) => void,
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
    xhr.onerror = () => reject(new ConversionError("serviceUnavailable"));
    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as Blob);
        return;
      }
      let code: unknown = xhr.status === 429 ? "rateLimited" : "conversionFailed";
      try {
        code = JSON.parse(await (xhr.response as Blob).text()).error ?? code;
      } catch {
        // Non-JSON error page (proxy, crash): keep the generic code.
      }
      const known = isApiErrorCode(code) ? code : "conversionFailed";
      reject(new ConversionError(known, isLoggedByServerCode(known)));
    };
    xhr.send(form);
  });
}
