import { isApiErrorCode, type ApiErrorCode } from "./api-errors";

/** A failed conversion with a code the UI can translate. */
export class ConversionError extends Error {
  /**
   * @param loggedByServer the conversion API already stored this failure in
   * the stats, so the browser must not report it again.
   */
  constructor(
    readonly code: ApiErrorCode,
    readonly loggedByServer = false,
  ) {
    super(code);
    this.name = "ConversionError";
  }
}

export function errorCode(error: unknown): ApiErrorCode {
  return error instanceof ConversionError && isApiErrorCode(error.code) ? error.code : "conversionFailed";
}

// Failures the conversion APIs log themselves (after trying to convert);
// rejections before that (size, rate limit, format) are only seen by the browser.
const serverLoggedCodes: readonly ApiErrorCode[] = ["conversionFailed", "serviceUnavailable", "pdfHasNoText"];

export function isLoggedByServerCode(code: ApiErrorCode): boolean {
  return serverLoggedCodes.includes(code);
}
