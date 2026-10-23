"use client";

import { canvasToBlob, openPdf, renderPage } from "./render";

export interface PageImage {
  blob: Blob;
  /** 1-based page number. */
  page: number;
}

/** Renders every page of a PDF to JPG or PNG at the given resolution. */
export async function pdfToImages(
  file: Blob,
  to: "jpg" | "png",
  { dpi = 150, quality = 85 }: { dpi?: number; quality?: number } = {},
  onProgress?: (progress: number) => void,
): Promise<PageImage[]> {
  const doc = await openPdf(file);
  try {
    const out: PageImage[] = [];
    for (let i = 0; i < doc.numPages; i++) {
      const canvas = await renderPage(doc, i, { scale: dpi / 72 });
      const blob = await canvasToBlob(canvas, to === "jpg" ? "image/jpeg" : "image/png", quality / 100);
      // Free the bitmap memory right away: long PDFs would otherwise pile up.
      canvas.width = canvas.height = 0;
      out.push({ blob, page: i + 1 });
      onProgress?.((i + 1) / doc.numPages);
    }
    return out;
  } finally {
    await doc.loadingTask.destroy();
  }
}

/** "report.pdf", page 3 of 12 → "report-03.jpg". */
export function pageImageName(pdfName: string, page: number, total: number, ext: string) {
  // Drop whatever extension the name has: a PDF saved as "report.docx" too.
  const base = pdfName.replace(/\.[^.]+$/, "") || "page";
  return `${base}-${String(page).padStart(String(total).length, "0")}.${ext}`;
}
