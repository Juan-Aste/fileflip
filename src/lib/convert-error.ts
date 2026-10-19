import { isApiErrorCode, type ApiErrorCode } from "./api-errors";

/** A failed conversion with a code the UI can translate. */
export class ConversionError extends Error {
  constructor(readonly code: ApiErrorCode) {
    super(code);
    this.name = "ConversionError";
  }
}

export function errorCode(error: unknown): ApiErrorCode {
  return error instanceof ConversionError && isApiErrorCode(error.code) ? error.code : "conversionFailed";
}
