import { HtmlTooComplexError, htmlToPrintHtml } from "@/lib/server/html-print";
import { printUpload } from "@/lib/server/print-route";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * HTML → PDF: the page is sanitized here (html-print.ts: no scripts, no
 * requests) and printed by Gotenberg's Chromium. In memory only.
 */
export function POST(request: Request) {
  return printUpload(request, "html-to-pdf", htmlToPrintHtml, (error) => (error instanceof HtmlTooComplexError ? "fileDamaged" : null));
}
