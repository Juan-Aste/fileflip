// Error codes returned by the API as { error: code }. The UI translates them
// via the "ApiErrors" messages namespace, so the server never sends prose.
export const apiErrorCodes = [
  "fileTooLarge",
  "tooManyFiles",
  "unsupportedFormat",
  "invalidRequest",
  "rateLimited",
  "conversionFailed",
  "serviceUnavailable",
  "pdfHasNoText",
  "fileDamaged",
  // Client-side only: a data file (JSON, CSV...) whose content can't be parsed.
  "invalidData",
  "signInRequired",
  "paymentsUnavailable",
  // Client-side only: the device can't run it and the server can't either.
  "browserUnsupported",
  // Client-side only: the job engine stopped the work (user or time limit).
  "jobCancelled",
  "jobTimedOut",
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

const status: Record<ApiErrorCode, number> = {
  fileTooLarge: 413,
  tooManyFiles: 413,
  unsupportedFormat: 415,
  invalidRequest: 400,
  rateLimited: 429,
  conversionFailed: 422,
  serviceUnavailable: 503,
  pdfHasNoText: 422,
  fileDamaged: 422,
  invalidData: 422,
  signInRequired: 401,
  paymentsUnavailable: 503,
  browserUnsupported: 400,
  jobCancelled: 400,
  jobTimedOut: 408,
};

export function apiError(code: ApiErrorCode, headers?: HeadersInit) {
  return Response.json({ error: code }, { status: status[code], headers });
}

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && (apiErrorCodes as readonly string[]).includes(value);
}
