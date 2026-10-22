import "server-only";
import { Document, HeadingLevel, Packer, PageBreak, Paragraph, TextRun } from "docx";
import { paragraphsFromRuns, type TextRun as PdfTextRun } from "@/lib/pdf/text-layout";

export class PdfHasNoTextError extends Error {
  constructor() {
    super("The PDF has no extractable text (scanned?)");
    this.name = "PdfHasNoTextError";
  }
}

const MAX_PAGES = 300;

/**
 * PDF → editable Word document: text is extracted with pdf.js and rebuilt
 * as paragraphs and headings, one Word page per PDF page. Complex layouts
 * (columns, tables, images) are simplified; the UI warns about it.
 */
export async function pdfToDocx(bytes: Uint8Array): Promise<Buffer> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // In Node pdf.js runs its "worker" in-process; registering the module here
  // avoids a runtime file lookup that fails once the server is bundled.
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker ??= await import(
    "pdfjs-dist/legacy/build/pdf.worker.mjs"
  );
  const pdf = await getDocument({
    data: bytes.slice(),
    disableFontFace: true,
    // Text extraction needs no font files; silence the warnings about them.
    verbosity: 0,
  }).promise;
  try {
    const children: Paragraph[] = [];
    let hasText = false;
    const pages = Math.min(pdf.numPages, MAX_PAGES);
    let pageSize: { width: number; height: number } | undefined;

    for (let n = 1; n <= pages; n++) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      pageSize ??= { width: viewport.width, height: viewport.height };
      const content = await page.getTextContent();
      const runs: PdfTextRun[] = content.items.flatMap((item) =>
        "str" in item
          ? [
              {
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                size: Math.hypot(item.transform[2], item.transform[3]) || item.height || 10,
                width: item.width,
              },
            ]
          : [],
      );
      const paragraphs = paragraphsFromRuns(runs);
      if (paragraphs.length) hasText = true;
      if (n > 1) children.push(new Paragraph({ children: [new PageBreak()] }));
      for (const p of paragraphs) {
        children.push(
          new Paragraph({
            heading: p.heading ? HeadingLevel.HEADING_2 : undefined,
            spacing: { after: 120 },
            children: [new TextRun({ text: p.text, size: Math.round(p.size * 2), bold: p.heading })],
          }),
        );
      }
      page.cleanup();
    }
    if (!hasText) throw new PdfHasNoTextError();

    // Points → twentieths of a point (twips), keeping the PDF's page size.
    const twips = (pt: number) => Math.round(pt * 20);
    const doc = new Document({
      creator: "Fileflect",
      sections: [
        {
          properties: pageSize
            ? { page: { size: { width: twips(pageSize.width), height: twips(pageSize.height) } } }
            : {},
          children,
        },
      ],
    });
    return await Packer.toBuffer(doc);
  } finally {
    await pdf.loadingTask.destroy();
  }
}
