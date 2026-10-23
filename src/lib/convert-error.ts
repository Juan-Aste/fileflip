import { isApiErrorCode, type ApiErrorCode } from "./api-errors";
import { browserLacksToolFeatures } from "./capabilities";

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

/** A failure caused by one of several input files (its position in the list). */
export class InputFileError extends ConversionError {
  constructor(
    code: ApiErrorCode,
    readonly index: number,
  ) {
    super(code);
  }
}

/** A syntax error in a text input, with where it is (1-based line and column). */
export class TextPositionError extends ConversionError {
  constructor(
    code: ApiErrorCode,
    readonly position: { line: number; column: number },
  ) {
    super(code);
  }
}

/** The code of an unexpected failure: "this browser can't" where it lacks the features tools need (B-07). */
export function unexpectedErrorCode(): ApiErrorCode {
  return browserLacksToolFeatures() ? "browserUnsupported" : "conversionFailed";
}

export function errorCode(error: unknown): ApiErrorCode {
  return error instanceof ConversionError && isApiErrorCode(error.code) ? error.code : unexpectedErrorCode();
}

// Failures the conversion APIs log themselves (after trying to convert);
// rejections before that (size, rate limit, format) are only seen by the browser.
const serverLoggedCodes: readonly ApiErrorCode[] = ["conversionFailed", "serviceUnavailable", "pdfHasNoText"];

export function isLoggedByServerCode(code: ApiErrorCode): boolean {
  return serverLoggedCodes.includes(code);
}
