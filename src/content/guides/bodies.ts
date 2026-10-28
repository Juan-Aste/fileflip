import type { Locale } from "@/i18n/routing";
import csvVsExcelEn from "./bodies/csv-vs-excel.en";
import csvVsExcelEs from "./bodies/csv-vs-excel.es";
import csvVsExcelPt from "./bodies/csv-vs-excel.pt";
import heicToJpgEn from "./bodies/heic-to-jpg.en";
import heicToJpgEs from "./bodies/heic-to-jpg.es";
import heicToJpgPt from "./bodies/heic-to-jpg.pt";
import imageFormatsEn from "./bodies/image-formats.en";
import imageFormatsEs from "./bodies/image-formats.es";
import imageFormatsPt from "./bodies/image-formats.pt";
import pdfAEn from "./bodies/pdf-a.en";
import pdfAEs from "./bodies/pdf-a.es";
import pdfAPt from "./bodies/pdf-a.pt";
import pdfTableToExcelEn from "./bodies/pdf-table-to-excel.en";
import pdfTableToExcelEs from "./bodies/pdf-table-to-excel.es";
import pdfTableToExcelPt from "./bodies/pdf-table-to-excel.pt";
import pdfToWordEn from "./bodies/pdf-to-word.en";
import pdfToWordEs from "./bodies/pdf-to-word.es";
import pdfToWordPt from "./bodies/pdf-to-word.pt";
import readAloudEn from "./bodies/read-aloud.en";
import readAloudEs from "./bodies/read-aloud.es";
import readAloudPt from "./bodies/read-aloud.pt";
import reducePdfSizeEn from "./bodies/reduce-pdf-size.en";
import reducePdfSizeEs from "./bodies/reduce-pdf-size.es";
import reducePdfSizePt from "./bodies/reduce-pdf-size.pt";
import signPdfEn from "./bodies/sign-pdf.en";
import signPdfEs from "./bodies/sign-pdf.es";
import signPdfPt from "./bodies/sign-pdf.pt";
import transcribeAudioEn from "./bodies/transcribe-audio.en";
import transcribeAudioEs from "./bodies/transcribe-audio.es";
import transcribeAudioPt from "./bodies/transcribe-audio.pt";

// Markdown body of each guide, by guide id and language (see meta.ts and
// src/lib/guides/render.ts for the link and screenshot syntax). Imported only
// by the guide pages.
export const guideBodies: Record<string, Partial<Record<Locale, string>>> = {
  "pdf-to-word": { es: pdfToWordEs, en: pdfToWordEn, pt: pdfToWordPt },
  "image-formats": { es: imageFormatsEs, en: imageFormatsEn, pt: imageFormatsPt },
  "reduce-pdf-size": { es: reducePdfSizeEs, en: reducePdfSizeEn, pt: reducePdfSizePt },
  "heic-to-jpg": { es: heicToJpgEs, en: heicToJpgEn, pt: heicToJpgPt },
  "pdf-table-to-excel": { es: pdfTableToExcelEs, en: pdfTableToExcelEn, pt: pdfTableToExcelPt },
  "csv-vs-excel": { es: csvVsExcelEs, en: csvVsExcelEn, pt: csvVsExcelPt },
  "transcribe-audio": { es: transcribeAudioEs, en: transcribeAudioEn, pt: transcribeAudioPt },
  "read-aloud": { es: readAloudEs, en: readAloudEn, pt: readAloudPt },
  "sign-pdf": { es: signPdfEs, en: signPdfEn, pt: signPdfPt },
  "pdf-a": { es: pdfAEs, en: pdfAEn, pt: pdfAPt },
};
