import { markdownToPrintHtml } from "@/lib/server/markdown-pdf";
import { printUpload } from "@/lib/server/print-route";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Markdown → PDF: the Markdown is rendered here into an inert HTML page
 * (markdown-pdf.ts) and printed by Gotenberg's Chromium. In memory only.
 */
export function POST(request: Request) {
  return printUpload(request, "markdown-to-pdf", markdownToPrintHtml);
}
