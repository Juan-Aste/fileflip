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

// A lazy chunk, worker script or WASM file that failed to load (Chromium, Firefox, Safari wordings).
const loadFailure = /ChunkLoadError|Loading (CSS )?chunk|dynamically imported module|Importing a module script failed|Failed to fetch|NetworkError|Load failed/i;

/**
 * The code of an unexpected failure. Tools load their engine when they run, so
 * offline (or after a deploy replaced the files) that load fails: say so (B-10).
 * Where the browser lacks the features tools need: "this browser can't" (B-07).
 */
export function unexpectedErrorCode(error?: unknown): ApiErrorCode {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "connectionLost";
  if (error instanceof Error && loadFailure.test(`${error.name} ${error.message}`)) return "connectionLost";
  return browserLacksToolFeatures() ? "browserUnsupported" : "conversionFailed";
}

export function errorCode(error: unknown): ApiErrorCode {
  return error instanceof ConversionError && isApiErrorCode(error.code) ? error.code : unexpectedErrorCode(error);
}

// Failures the conversion APIs log themselves (after trying to convert);
// rejections before that (size, rate limit, format) are only seen by the browser.
const serverLoggedCodes: readonly ApiErrorCode[] = ["conversionFailed", "serviceUnavailable", "pdfHasNoText"];

export function isLoggedByServerCode(code: ApiErrorCode): boolean {
  return serverLoggedCodes.includes(code);
}
