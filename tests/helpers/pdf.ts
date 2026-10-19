import { PDFDocument } from "pdf-lib";

/** A PDF whose pages have distinct widths, so page order can be checked. */
export async function makePdf(widths: number[]) {
  const doc = await PDFDocument.create();
  widths.forEach((w) => doc.addPage([w, 500]));
  return doc.save();
}

export async function pageWidths(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => Math.round(p.getWidth()));
}
