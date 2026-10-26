"use client";

// Text of a file picked in the read-aloud tool, all on the user's device:
// TXT, Markdown, HTML, Word, EPUB, PDF with text (pdf.js) and images (OCR
// with tesseract). Each engine loads only when its format is picked.
import type { FormatId } from "@/config/formats";
import { ConversionError } from "@/lib/convert-error";
import { decodeText } from "@/lib/data/text";
import { detectFileFormat } from "@/lib/detect";
import type { OcrLanguage } from "@/lib/ocr/text";
import type { DocumentText } from "./formats";
import { normalizeText } from "./text";

export type TextSourceKind = "txt" | "md" | "html" | "docx" | "epub" | "pdf" | "image";

/** Extensions the file picker offers. */
export const ttsInputExtensions = ["txt", "md", "markdown", "html", "htm", "docx", "epub", "pdf", "jpg", "jpeg", "png", "webp", "gif", "bmp", "tif", "tiff", "heic", "heif", "avif"];

const IMAGE_FORMATS = new Set<FormatId>(["jpg", "png", "webp", "gif", "bmp", "tiff", "heic", "avif"]);

/** What a file holds, from its bytes (a text file's flavor from its extension). */
export async function textSourceKind(file: File): Promise<TextSourceKind | null> {
  const format = await detectFileFormat(file);
  if (format === "txt") {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "md" || ext === "markdown") return "md";
    if (ext === "html" || ext === "htm") return "html";
    return "txt";
  }
  if (format === "docx" || format === "epub" || format === "pdf") return format;
  if (format && IMAGE_FORMATS.has(format)) return "image";
  return null;
}

export interface ExtractTextOptions {
  /** Language of the text in an image (OCR). */
  ocrLanguage: OcrLanguage;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

export async function extractTextFromFile(file: File, { ocrLanguage, signal, onProgress }: ExtractTextOptions): Promise<DocumentText & { kind: TextSourceKind }> {
  const kind = await textSourceKind(file);
  if (!kind) throw new ConversionError("unsupportedFormat");
  const bytes = () => file.arrayBuffer().then((b) => new Uint8Array(b));
  let result: DocumentText;
  if (kind === "pdf") {
    const [{ openPdf }, { extractPdfText }] = await Promise.all([import("@/lib/pdf/render"), import("@/lib/pdf/text")]);
    let doc;
    try {
      doc = await openPdf(file);
    } catch (error) {
      throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
    }
    try {
      const info = (await doc.getMetadata().catch(() => null))?.info as { Title?: unknown } | undefined;
      const title = typeof info?.Title === "string" && info.Title.trim() ? info.Title.trim() : undefined;
      result = { text: normalizeText(await extractPdfText(doc, { onProgress, signal })), title };
    } finally {
      void doc.loadingTask.destroy();
    }
  } else if (kind === "image") {
    const { createOcrSession, prepareOcrImage } = await import("@/lib/ocr/client");
    const image = await prepareOcrImage(file);
    const session = await createOcrSession(ocrLanguage, signal);
    try {
      const { text } = await session.recognize(image, { signal, onProgress });
      if (!text.trim()) throw new ConversionError("ocrNoText");
      result = { text: normalizeText(text) };
    } finally {
      void session.terminate().catch(() => {});
    }
  } else {
    const formats = await import("./formats");
    const data = await bytes();
    if (kind === "docx") result = formats.docxText(data);
    else if (kind === "epub") result = formats.epubText(data);
    else if (kind === "html") result = formats.htmlText(decodeText(data));
    else if (kind === "md") result = formats.markdownText(decodeText(data));
    else result = formats.plainText(data);
  }
  onProgress?.(1);
  return { ...result, kind };
}
