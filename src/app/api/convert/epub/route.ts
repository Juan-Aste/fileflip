import { HtmlTooComplexError, htmlToPrintHtml } from "@/lib/server/html-print";
import { printUpload } from "@/lib/server/print-route";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * EPUB → PDF: the browser reads the book and assembles it into one page
 * (lib/ebook); that page is sanitized again here like any uploaded HTML
 * (html-print.ts: no scripts, no requests) and printed by Gotenberg's Chromium.
 */
export function POST(request: Request) {
  return printUpload(request, "epub-to-pdf", htmlToPrintHtml, (error) => (error instanceof HtmlTooComplexError ? "fileDamaged" : null));
}
