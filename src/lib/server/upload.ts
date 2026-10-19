import "server-only";
import { formats, type FormatId } from "@/config/formats";
import { limits, type Plan } from "@/config/limits";
import { apiError } from "@/lib/api-errors";
import { detectFormat } from "@/lib/detect";
import { clientIp, conversionLimiter } from "./rate-limit";

export interface Upload {
  file: File;
  bytes: Uint8Array;
  /** Real format, detected from the content. */
  from: FormatId;
  to: FormatId;
  form: FormData;
}

/**
 * Reads and validates a conversion upload: size within the plan's limit and
 * a real format (magic bytes) accepted by `allowed`. Returns a ready error
 * Response when something is wrong.
 */
export async function readUpload(
  request: Request,
  plan: Plan,
  allowed: (from: FormatId, to: FormatId) => boolean,
  { signedIn = false }: { signedIn?: boolean } = {},
): Promise<Upload | Response> {
  // Anonymous users are rate limited per IP; accounts are trusted more.
  if (!signedIn) {
    const waitMs = conversionLimiter.hit(clientIp(request));
    if (waitMs > 0) return apiError("rateLimited", { "Retry-After": String(Math.ceil(waitMs / 1000)) });
  }

  const maxBytes = limits[plan].serverMaxFileBytes;
  // Reject obviously oversized bodies before buffering them.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes + 64 * 1024) return apiError("fileTooLarge");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("invalidRequest");
  }
  const file = form.get("file");
  const to = String(form.get("to") ?? "") as FormatId;
  if (!(file instanceof File) || !(to in formats)) return apiError("invalidRequest");
  if (file.size > maxBytes) return apiError("fileTooLarge");

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Trust the content, not the name or the declared MIME type.
  const from = detectFormat(bytes, file.name);
  if (!from || !allowed(from, to)) return apiError("unsupportedFormat");
  return { file, bytes, from, to, form };
}
