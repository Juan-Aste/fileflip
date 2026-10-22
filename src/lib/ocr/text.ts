// Pure helpers of the OCR tools (kept apart from tesseract.js so pages and
// tests can use them without loading the engine).

export const ocrLanguages = ["es", "en", "pt", "fr", "zh"] as const;
export type OcrLanguage = (typeof ocrLanguages)[number];

/** Tesseract model names. */
export const tesseractLanguage: Record<OcrLanguage, string> = { es: "spa", en: "eng", pt: "por", fr: "fra", zh: "chi_sim" };

/** Beyond this the image is reduced: bigger only costs time and memory. */
export const OCR_MAX_SIDE = 4000;

/**
 * The size an image is recognized at. Images are never enlarged: tesseract
 * reads text of normal size better than blown-up glyphs (a 48 px Chinese
 * line upscaled 2× was misread), so only huge photos are reduced.
 */
export function ocrSize(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  const scale = longest > OCR_MAX_SIDE ? OCR_MAX_SIDE / longest : 1;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const CJK = "\\u2e80-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef";
const cjkGap = new RegExp(`(?<=[${CJK}])[ \\t]+(?=[${CJK}])`, "g");

/**
 * Tidies tesseract's output: no spaces between Chinese characters (it puts
 * one between most of them), no trailing spaces, at most one blank line in a
 * row, and a final newline.
 */
export function cleanOcrText(text: string, language: OcrLanguage): string {
  let clean = text.replace(/\r\n?/g, "\n");
  if (language === "zh") clean = clean.replace(cjkGap, "");
  clean = clean
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return clean ? `${clean}\n` : "";
}
