// Searchable PDFs: tesseract's text-only page (invisible text in its
// GlyphLessFont, sized like the rendered page) is drawn over each scanned
// page of the original document, whose content stays untouched.
import { PDFDocument } from "pdf-lib";
import { ConversionError } from "@/lib/convert-error";
import { placeBox, visualPage } from "./stamp";

/** `layers[i]` is the OCR layer of page i, or null to leave the page as it is. */
export async function addTextLayers(bytes: Uint8Array, layers: readonly (Uint8Array | null)[]): Promise<Uint8Array> {
  let doc: PDFDocument;
  let pages;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    pages = doc.getPages();
  } catch {
    throw new ConversionError("fileDamaged");
  }
  if (layers.length !== pages.length) throw new ConversionError("invalidRequest");
  for (const [i, layer] of layers.entries()) {
    if (!layer) continue;
    let embedded;
    try {
      [embedded] = await doc.embedPdf(layer, [0]);
    } catch {
      throw new ConversionError("conversionFailed");
    }
    const page = pages[i]!;
    // The layer matches the page as the reader sees it (crop box, /Rotate applied).
    const visual = visualPage(page);
    const at = placeBox(visual, visual.width, visual.height, visual.width / 2, visual.height / 2, 0);
    page.drawPage(embedded!, { ...at, width: visual.width, height: visual.height });
  }
  doc.setProducer("Fileflect (Tesseract OCR)");
  return doc.save({ useObjectStreams: true });
}
