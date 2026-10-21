// Plain text of a PDF with pdf.js: items joined in reading order as pdf.js
// gives them, a line break where pdf.js marks the end of a line (or the text
// jumps to another line), pages separated by a blank line or a heading.
import { ConversionError } from "@/lib/convert-error";

export interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
}

interface DocLike {
  numPages: number;
  getPage(n: number): Promise<{ getTextContent(): Promise<{ items: unknown[] }>; cleanup?: () => void }>;
}

/** One page's text, with trailing spaces trimmed from each line. */
export function pageText(items: readonly TextItemLike[]): string {
  let out = "";
  let lastY: number | undefined;
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    const y = item.transform?.[5];
    // pdf.js only flags some line ends: a clear vertical jump is a new line too.
    if (lastY !== undefined && y !== undefined && Math.abs(y - lastY) > 2 && out && !out.endsWith("\n")) out += "\n";
    out += item.str;
    // pdf.js also emits empty items that only carry an end of line: don't double it.
    if (item.hasEOL && (item.str !== "" || !out.endsWith("\n"))) out += "\n";
    if (y !== undefined) lastY = y;
  }
  return out
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface ExtractOptions {
  /** Heading before each page ("--- Page 2 ---"); pages are only separated by a blank line without it. */
  pageHeading?: (n: number) => string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

/** Text of every page; fails with `pdfIsScanned` when there is none (a scan). */
export async function extractPdfText(doc: DocLike, { pageHeading, onProgress, signal }: ExtractOptions = {}): Promise<string> {
  const pages: string[] = [];
  let any = false;
  for (let n = 1; n <= doc.numPages; n++) {
    if (signal?.aborted) throw new ConversionError("jobCancelled");
    const page = await doc.getPage(n);
    const text = pageText((await page.getTextContent()).items as TextItemLike[]);
    page.cleanup?.();
    any ||= text !== "";
    pages.push(pageHeading ? `${pageHeading(n)}\n\n${text}` : text);
    onProgress?.(n / doc.numPages);
  }
  if (!any) throw new ConversionError("pdfIsScanned");
  return `${pages.join(pageHeading ? "\n\n\n" : "\n\n")}\n`;
}
