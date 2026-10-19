import { formats, type FormatId } from "./formats";

// Image conversions our server (sharp/libvips) can do, shared by the client
// (to decide on a fallback) and the API. sharp's prebuilt libvips reads HEIF
// only with AV1 (AVIF), not HEVC (HEIC), and cannot read BMP or ICO.
export const serverImageInputs: readonly FormatId[] = ["jpg", "png", "webp", "avif", "gif", "tiff", "svg"];
export const serverImageOutputs: readonly FormatId[] = ["jpg", "png", "webp", "avif", "gif", "tiff", "bmp", "ico"];

export function canConvertImageOnServer(from: FormatId, to: FormatId) {
  return serverImageInputs.includes(from) && serverImageOutputs.includes(to);
}

/** Office documents converted to PDF by LibreOffice (Gotenberg). */
export const officeInputs = (Object.keys(formats) as FormatId[]).filter((f) => formats[f].category === "document");

export function canConvertDocumentOnServer(from: FormatId, to: FormatId) {
  return (to === "pdf" && officeInputs.includes(from)) || (from === "pdf" && to === "docx");
}
