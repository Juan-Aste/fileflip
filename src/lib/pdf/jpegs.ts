// The images of a PDF stored as plain JPEG, to save them byte for byte when
// extracting images (images.ts). Runs in the PDF worker (pdf-lib).
import { PDFDocument, PDFName, PDFRawStream, type PDFRef } from "pdf-lib";
import { sourceImage } from "./compress";

/** Same key as pdf.js's `Ref.toString()`: "12R", or "12R1" for generation 1. */
export const refKey = (ref: PDFRef) => `${ref.objectNumber}R${ref.generationNumber || ""}`;

/** JPEG bytes of the images that can be saved as they are, by reference. */
export async function originalJpegs(bytes: Uint8Array): Promise<Record<string, Uint8Array>> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    return {};
  }
  // Encrypted streams are only readable through pdf.js.
  if (doc.isEncrypted) return {};
  const out: Record<string, Uint8Array> = {};
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    // A mask changes how the image looks: those go through pdf.js.
    if (obj.dict.get(PDFName.of("SMask")) || obj.dict.get(PDFName.of("Mask"))) continue;
    const image = sourceImage(doc, obj);
    if (image?.kind === "jpeg" && image.bytes[0] === 0xff && image.bytes[1] === 0xd8) out[refKey(ref)] = image.bytes.slice();
  }
  return out;
}
