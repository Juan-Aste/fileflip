import type { Locale } from "@/i18n/routing";
import csvVsExcelEs from "./bodies/csv-vs-excel.es";
import heicToJpgEs from "./bodies/heic-to-jpg.es";
import imageFormatsEs from "./bodies/image-formats.es";
import pdfTableToExcelEs from "./bodies/pdf-table-to-excel.es";
import pdfToWordEs from "./bodies/pdf-to-word.es";
import reducePdfSizeEs from "./bodies/reduce-pdf-size.es";
import transcribeAudioEs from "./bodies/transcribe-audio.es";

// Markdown body of each guide, by guide id and language (see meta.ts and
// src/lib/guides/render.ts for the link and screenshot syntax). Imported only
// by the guide pages.
export const guideBodies: Record<string, Partial<Record<Locale, string>>> = {
  "pdf-to-word": { es: pdfToWordEs },
  "image-formats": { es: imageFormatsEs },
  "reduce-pdf-size": { es: reducePdfSizeEs },
  "heic-to-jpg": { es: heicToJpgEs },
  "pdf-table-to-excel": { es: pdfTableToExcelEs },
  "csv-vs-excel": { es: csvVsExcelEs },
  "transcribe-audio": { es: transcribeAudioEs },
};
