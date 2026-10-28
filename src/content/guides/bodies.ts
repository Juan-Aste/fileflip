import type { Locale } from "@/i18n/routing";
import csvVsExcelEn from "./bodies/csv-vs-excel.en";
import csvVsExcelEs from "./bodies/csv-vs-excel.es";
import heicToJpgEn from "./bodies/heic-to-jpg.en";
import heicToJpgEs from "./bodies/heic-to-jpg.es";
import imageFormatsEn from "./bodies/image-formats.en";
import imageFormatsEs from "./bodies/image-formats.es";
import pdfAEn from "./bodies/pdf-a.en";
import pdfAEs from "./bodies/pdf-a.es";
import pdfTableToExcelEn from "./bodies/pdf-table-to-excel.en";
import pdfTableToExcelEs from "./bodies/pdf-table-to-excel.es";
import pdfToWordEn from "./bodies/pdf-to-word.en";
import pdfToWordEs from "./bodies/pdf-to-word.es";
import readAloudEn from "./bodies/read-aloud.en";
import readAloudEs from "./bodies/read-aloud.es";
import reducePdfSizeEn from "./bodies/reduce-pdf-size.en";
import reducePdfSizeEs from "./bodies/reduce-pdf-size.es";
import signPdfEn from "./bodies/sign-pdf.en";
import signPdfEs from "./bodies/sign-pdf.es";
import transcribeAudioEn from "./bodies/transcribe-audio.en";
import transcribeAudioEs from "./bodies/transcribe-audio.es";

// Markdown body of each guide, by guide id and language (see meta.ts and
// src/lib/guides/render.ts for the link and screenshot syntax). Imported only
// by the guide pages.
export const guideBodies: Record<string, Partial<Record<Locale, string>>> = {
  "pdf-to-word": { es: pdfToWordEs, en: pdfToWordEn },
  "image-formats": { es: imageFormatsEs, en: imageFormatsEn },
  "reduce-pdf-size": { es: reducePdfSizeEs, en: reducePdfSizeEn },
  "heic-to-jpg": { es: heicToJpgEs, en: heicToJpgEn },
  "pdf-table-to-excel": { es: pdfTableToExcelEs, en: pdfTableToExcelEn },
  "csv-vs-excel": { es: csvVsExcelEs, en: csvVsExcelEn },
  "transcribe-audio": { es: transcribeAudioEs, en: transcribeAudioEn },
  "read-aloud": { es: readAloudEs, en: readAloudEn },
  "sign-pdf": { es: signPdfEs, en: signPdfEn },
  "pdf-a": { es: pdfAEs, en: pdfAEn },
};
