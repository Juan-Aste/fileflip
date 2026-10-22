// Places a signature image (PNG with transparency) on a PDF page. Positions
// are fractions of the page as the reader sees it, so the signature lands
// where it was dropped on the preview, also on rotated pages. This is a
// visible signature, not a certified digital signature.
import { PDFDocument } from "pdf-lib";
import { ConversionError } from "@/lib/convert-error";
import { placeBox, visualPage } from "./stamp";

export interface SignaturePlacement {
  /** 0-based page. */
  page: number;
  /** Center of the signature, 0-1 from the visual left and top. */
  x: number;
  y: number;
  /** Signature width as a share of the visual page width (0.02-1). */
  width: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export async function signPdf(bytes: Uint8Array, png: Uint8Array, placements: readonly SignaturePlacement[]): Promise<Uint8Array> {
  if (placements.length === 0) throw new ConversionError("invalidRequest");
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new ConversionError("fileDamaged");
  }
  let image;
  try {
    image = await doc.embedPng(png);
  } catch {
    throw new ConversionError("fileDamaged");
  }
  try {
    const pages = doc.getPages();
    for (const p of placements) {
      const page = pages[p.page];
      if (!page) throw new ConversionError("pagesOutOfRange");
      const visual = visualPage(page);
      const width = visual.width * clamp(p.width, 0.02, 1);
      const height = (width * image.height) / image.width;
      const at = placeBox(visual, width, height, visual.width * clamp(p.x, 0, 1), visual.height * (1 - clamp(p.y, 0, 1)), 0);
      page.drawImage(image, { ...at, width, height });
    }
    doc.setProducer("Fileflect");
    return await doc.save({ useObjectStreams: true });
  } catch (error) {
    throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
  }
}

/**
 * Crops an RGBA signature to its ink (alpha > 0) with a small padding; null
 * when nothing was drawn. Optionally turns near-white pixels transparent
 * (a photo of a signature on paper).
 */
export function trimSignature(rgba: Uint8ClampedArray, width: number, height: number, { removeWhite = false, pad = 4 } = {}) {
  if (removeWhite) {
    for (let i = 0; i < rgba.length; i += 4) {
      const light = Math.min(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!);
      // Paper (and its shadows) fades out; ink keeps its alpha.
      if (light > 200) rgba[i + 3] = 0;
      else if (light > 140) rgba[i + 3] = Math.round((rgba[i + 3]! * (200 - light)) / 60);
    }
  }
  let top = height;
  let bottom = -1;
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3]! > 8) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom < 0) return null;
  const x = Math.max(0, left - pad);
  const y = Math.max(0, top - pad);
  return { x, y, width: Math.min(width, right + pad + 1) - x, height: Math.min(height, bottom + pad + 1) - y };
}
