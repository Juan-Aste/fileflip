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
  // Client-side only: valid data that TOML can't represent (no root table, null in a list).
  "tomlUnsupported",
  // Client-side only: an XML file declaring DTD entities (refused: XXE, entity expansion).
  "xmlEntitiesBlocked",
  // Client-side only: QR codes (text too long to encode, no code found in the image).
  "qrTooLong",
  "qrNotFound",
  // Client-side only: an image that can't reach the asked file size without becoming tiny.
  "targetTooSmall",
  // Client-side only: page ranges beyond the last page of one of the PDFs.
  "pagesOutOfRange",
  // Client-side only: PDF → text on a scan (no text layer).
  "pdfIsScanned",
  // Client-side only: PDF passwords (protect an already encrypted PDF, unlock one without a password, wrong password).
  "pdfAlreadyProtected",
  "pdfNotProtected",
  "pdfWrongPassword",
  // Client-side only: a page tool (merge, split, rotate…) given a PDF with an open password.
  "pdfPasswordRequired",
  // Client-side only: extracting images from a PDF that has none.
  "pdfHasNoImages",
  // Client-side only: a spreadsheet over the cell limit (or a ZIP declaring too much data).
  "tooManyCells",
  // Client-side only: archives (more than the extraction limits, password-protected, unsupported method).
  "archiveTooLarge",
  "archiveEncrypted",
  "archiveUnsupported",
  "archiveEmpty",
  // Client-side only: OCR found no text in the image.
  "ocrNoText",
  // Client-side only: OCR of a PDF with too many pages, or whose pages all have text already.
  "tooManyPages",
  "pdfAlreadySearchable",
  // Client-side only: an ebook locked with DRM (Adobe, LCP, Apple).
  "ebookDrm",
  // Client-side only: audio without an audio track, in a codec this browser can't decode, or longer than the limit.
  "noAudioTrack",
  "audioCodecUnsupported",
  "audioTooLong",
  // Client-side only: a trim range outside the audio or shorter than a tenth of a second.
  "audioRangeInvalid",
  // Client-side only: nothing to normalize.
  "audioSilent",
  // Client-side only: a file without video, a video codec this browser can't decode or encode, or longer than the limit.
  "noVideoTrack",
  "videoCodecUnsupported",
  "videoEncoderUnsupported",
  "videoTooLong",
  "videoRangeInvalid",
  "modelEmpty",
  "modelTooLarge",
  "modelExternalFiles",
  "modelCompressed",
  "modelXmlTooLarge",
  "modelFbxVersion",
  "dxfEmpty",
  "dxfTooComplex",
  "gifTooManyFrames",
  "signInRequired",
  "paymentsUnavailable",
  // Client-side only: the device can't run it and the server can't either.
  "browserUnsupported",
  // Client-side only: the tool's code or data couldn't load, or the upload couldn't
  // leave (offline, or a new deploy replaced the page's files).
  "connectionLost",
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
  tomlUnsupported: 422,
  xmlEntitiesBlocked: 422,
  qrTooLong: 422,
  qrNotFound: 422,
  targetTooSmall: 422,
  pagesOutOfRange: 422,
  pdfIsScanned: 422,
  pdfAlreadyProtected: 422,
  pdfNotProtected: 422,
  pdfWrongPassword: 422,
  pdfPasswordRequired: 422,
  pdfHasNoImages: 422,
  tooManyCells: 413,
  archiveTooLarge: 413,
  archiveEncrypted: 422,
  archiveUnsupported: 415,
  archiveEmpty: 422,
  ocrNoText: 422,
  ebookDrm: 422,
  noAudioTrack: 422,
  audioCodecUnsupported: 415,
  audioTooLong: 413,
  audioRangeInvalid: 422,
  audioSilent: 422,
  noVideoTrack: 422,
  videoCodecUnsupported: 415,
  videoEncoderUnsupported: 415,
  videoTooLong: 413,
  videoRangeInvalid: 422,
  modelEmpty: 422,
  modelTooLarge: 413,
  modelExternalFiles: 422,
  modelCompressed: 415,
  modelXmlTooLarge: 413,
  modelFbxVersion: 415,
  dxfEmpty: 422,
  dxfTooComplex: 413,
  gifTooManyFrames: 413,
  tooManyPages: 413,
  pdfAlreadySearchable: 422,
  signInRequired: 401,
  paymentsUnavailable: 503,
  browserUnsupported: 400,
  connectionLost: 503,
  jobCancelled: 400,
  jobTimedOut: 408,
};

export function apiError(code: ApiErrorCode, headers?: HeadersInit) {
  return Response.json({ error: code }, { status: status[code], headers });
}

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && (apiErrorCodes as readonly string[]).includes(value);
}
