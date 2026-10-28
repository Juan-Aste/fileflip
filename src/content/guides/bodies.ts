import type { Locale } from "@/i18n/routing";
import csvVsExcelEn from "./bodies/csv-vs-excel.en";
import csvVsExcelEs from "./bodies/csv-vs-excel.es";
import csvVsExcelFr from "./bodies/csv-vs-excel.fr";
import csvVsExcelPt from "./bodies/csv-vs-excel.pt";
import csvVsExcelZh from "./bodies/csv-vs-excel.zh";
import heicToJpgEn from "./bodies/heic-to-jpg.en";
import heicToJpgEs from "./bodies/heic-to-jpg.es";
import heicToJpgFr from "./bodies/heic-to-jpg.fr";
import heicToJpgPt from "./bodies/heic-to-jpg.pt";
import heicToJpgZh from "./bodies/heic-to-jpg.zh";
import imageFormatsEn from "./bodies/image-formats.en";
import imageFormatsEs from "./bodies/image-formats.es";
import imageFormatsFr from "./bodies/image-formats.fr";
import imageFormatsPt from "./bodies/image-formats.pt";
import imageFormatsZh from "./bodies/image-formats.zh";
import pdfAEn from "./bodies/pdf-a.en";
import pdfAEs from "./bodies/pdf-a.es";
import pdfAFr from "./bodies/pdf-a.fr";
import pdfAPt from "./bodies/pdf-a.pt";
import pdfAZh from "./bodies/pdf-a.zh";
import pdfTableToExcelEn from "./bodies/pdf-table-to-excel.en";
import pdfTableToExcelEs from "./bodies/pdf-table-to-excel.es";
import pdfTableToExcelFr from "./bodies/pdf-table-to-excel.fr";
import pdfTableToExcelPt from "./bodies/pdf-table-to-excel.pt";
import pdfTableToExcelZh from "./bodies/pdf-table-to-excel.zh";
import pdfToWordEn from "./bodies/pdf-to-word.en";
import pdfToWordEs from "./bodies/pdf-to-word.es";
import pdfToWordFr from "./bodies/pdf-to-word.fr";
import pdfToWordPt from "./bodies/pdf-to-word.pt";
import pdfToWordZh from "./bodies/pdf-to-word.zh";
import readAloudEn from "./bodies/read-aloud.en";
import readAloudEs from "./bodies/read-aloud.es";
import readAloudFr from "./bodies/read-aloud.fr";
import readAloudPt from "./bodies/read-aloud.pt";
import readAloudZh from "./bodies/read-aloud.zh";
import reducePdfSizeEn from "./bodies/reduce-pdf-size.en";
import reducePdfSizeEs from "./bodies/reduce-pdf-size.es";
import reducePdfSizeFr from "./bodies/reduce-pdf-size.fr";
import reducePdfSizePt from "./bodies/reduce-pdf-size.pt";
import reducePdfSizeZh from "./bodies/reduce-pdf-size.zh";
import signPdfEn from "./bodies/sign-pdf.en";
import signPdfEs from "./bodies/sign-pdf.es";
import signPdfFr from "./bodies/sign-pdf.fr";
import signPdfPt from "./bodies/sign-pdf.pt";
import signPdfZh from "./bodies/sign-pdf.zh";
import transcribeAudioEn from "./bodies/transcribe-audio.en";
import transcribeAudioEs from "./bodies/transcribe-audio.es";
import transcribeAudioFr from "./bodies/transcribe-audio.fr";
import transcribeAudioPt from "./bodies/transcribe-audio.pt";
import transcribeAudioZh from "./bodies/transcribe-audio.zh";

// Markdown body of each guide, by guide id and language (see meta.ts and
// src/lib/guides/render.ts for the link and screenshot syntax). Imported only
// by the guide pages.
export const guideBodies: Record<string, Partial<Record<Locale, string>>> = {
  "pdf-to-word": { es: pdfToWordEs, en: pdfToWordEn, pt: pdfToWordPt, fr: pdfToWordFr, zh: pdfToWordZh },
  "image-formats": { es: imageFormatsEs, en: imageFormatsEn, pt: imageFormatsPt, fr: imageFormatsFr, zh: imageFormatsZh },
  "reduce-pdf-size": { es: reducePdfSizeEs, en: reducePdfSizeEn, pt: reducePdfSizePt, fr: reducePdfSizeFr, zh: reducePdfSizeZh },
  "heic-to-jpg": { es: heicToJpgEs, en: heicToJpgEn, pt: heicToJpgPt, fr: heicToJpgFr, zh: heicToJpgZh },
  "pdf-table-to-excel": { es: pdfTableToExcelEs, en: pdfTableToExcelEn, pt: pdfTableToExcelPt, fr: pdfTableToExcelFr, zh: pdfTableToExcelZh },
  "csv-vs-excel": { es: csvVsExcelEs, en: csvVsExcelEn, pt: csvVsExcelPt, fr: csvVsExcelFr, zh: csvVsExcelZh },
  "transcribe-audio": { es: transcribeAudioEs, en: transcribeAudioEn, pt: transcribeAudioPt, fr: transcribeAudioFr, zh: transcribeAudioZh },
  "read-aloud": { es: readAloudEs, en: readAloudEn, pt: readAloudPt, fr: readAloudFr, zh: readAloudZh },
  "sign-pdf": { es: signPdfEs, en: signPdfEn, pt: signPdfPt, fr: signPdfFr, zh: signPdfZh },
  "pdf-a": { es: pdfAEs, en: pdfAEn, pt: pdfAPt, fr: pdfAFr, zh: pdfAZh },
};
