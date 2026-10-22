// Cropping PDF margins by setting each page's CropBox (what viewers and
// printers show); the content outside stays in the file, untouched.
import { PDFDocument } from "pdf-lib";
import { ConversionError } from "@/lib/convert-error";
import { toUserSpace, visualPage } from "./stamp";

/** Margins to remove, in points, as the reader sees the page. */
export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const MM = 72 / 25.4;
/** What's left of a page is never smaller than this (about 1 cm). */
const MIN_SIDE = 28;

/**
 * Bounds of the non-white content in an RGBA render (row 0 at the top), as
 * margins in pixels; null for a blank page.
 */
export function contentMargins(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number, threshold = 240) {
  let top = height;
  let bottom = -1;
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (rgba[i]! < threshold || rgba[i + 1]! < threshold || rgba[i + 2]! < threshold) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom < 0) return null;
  return { top, right: width - 1 - right, bottom: height - 1 - bottom, left };
}

/** Sets the CropBox of each page; `margins[i]` null leaves page i as it is. */
export async function cropPdf(bytes: Uint8Array, margins: readonly (Margins | null)[]): Promise<Uint8Array> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new ConversionError("fileDamaged");
  }
  try {
    for (const [i, page] of doc.getPages().entries()) {
      const m = margins[i];
      if (!m) continue;
      const visual = visualPage(page);
      // Keep at least MIN_SIDE visible on each axis.
      const scaleX = Math.min(1, Math.max(0, visual.width - MIN_SIDE) / Math.max(1e-6, m.left + m.right));
      const scaleY = Math.min(1, Math.max(0, visual.height - MIN_SIDE) / Math.max(1e-6, m.top + m.bottom));
      const a = toUserSpace(visual, Math.max(0, m.left) * scaleX, Math.max(0, m.bottom) * scaleY);
      const b = toUserSpace(visual, visual.width - Math.max(0, m.right) * scaleX, visual.height - Math.max(0, m.top) * scaleY);
      page.setCropBox(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    }
    doc.setProducer("Fileflect");
    return await doc.save({ useObjectStreams: true });
  } catch (error) {
    throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
  }
}
