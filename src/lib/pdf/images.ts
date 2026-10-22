// Extract images from a PDF. pdf.js decodes every image (any filter, color
// space or soft mask) into pixels that become PNGs; photos stored as plain
// JPEG are copied byte for byte instead (original quality, smaller files),
// matched to pdf.js's images by their object reference (see jpegs.ts, which
// runs in the PDF worker so pdf-lib stays out of the page's code).
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ConversionError } from "@/lib/convert-error";

/** An image as pdf.js hands it over: decoded pixels (`data`) or, in browsers, an ImageBitmap. */
export interface PdfjsImage {
  width: number;
  height: number;
  /** 1 = 1 bit gray (packed rows, 1 = white), 2 = RGB, 3 = RGBA. */
  kind?: number;
  data?: Uint8Array | Uint8ClampedArray;
  bitmap?: ImageBitmap;
  ref?: string | null;
}

/** RGBA pixels from pdf.js's decoded image data. */
export function toRgba({ width, height, kind, data }: PdfjsImage): Uint8ClampedArray {
  if (!data) throw new ConversionError("fileDamaged");
  const out = new Uint8ClampedArray(width * height * 4);
  if (kind === 3) out.set(data.subarray(0, out.length));
  else if (kind === 2) {
    for (let i = 0, j = 0; j < out.length; i += 3, j += 4) {
      out[j] = data[i]!;
      out[j + 1] = data[i + 1]!;
      out[j + 2] = data[i + 2]!;
      out[j + 3] = 255;
    }
  } else if (kind === 1) {
    const rowBytes = (width + 7) >> 3;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = data[y * rowBytes + (x >> 3)]! & (0x80 >> (x & 7)) ? 255 : 0;
        const j = (y * width + x) * 4;
        out[j] = out[j + 1] = out[j + 2] = v;
        out[j + 3] = 255;
      }
    }
  } else throw new ConversionError("fileDamaged");
  return out;
}

export interface ExtractedImage {
  /** 1-based page where the image first appears, and its number on that page. */
  page: number;
  index: number;
  type: "jpg" | "png";
  bytes: Uint8Array;
  width: number;
  height: number;
}

export interface ExtractOptions {
  /** Images narrower or shorter than this (icons, lines, bullets) are skipped. */
  minSide: number;
  /** From `originalJpegs`. */
  jpegs: Record<string, Uint8Array>;
  /** Encodes a decoded image as PNG. */
  encodePng: (image: PdfjsImage) => Promise<Uint8Array>;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

// pdf.js operator codes for drawing images (OPS.paintImageXObject, ...Repeat, paintInlineImageXObject).
const PAINT_IMAGE = 85;
const PAINT_IMAGE_REPEAT = 88;
const PAINT_INLINE_IMAGE = 86;

/** Every distinct image of the document, in page order; fails with `pdfHasNoImages` when there is none. */
export async function extractPdfImages(doc: PDFDocumentProxy, options: ExtractOptions): Promise<ExtractedImage[]> {
  const seen = new Set<string>();
  const out: ExtractedImage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    if (options.signal?.aborted) throw new ConversionError("jobCancelled");
    const page = await doc.getPage(n);
    const ops = await page.getOperatorList();
    let index = 0;
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (fn !== PAINT_IMAGE && fn !== PAINT_IMAGE_REPEAT && fn !== PAINT_INLINE_IMAGE) continue;
      const arg = (ops.argsArray[i] as unknown[])[0];
      let image: PdfjsImage;
      if (typeof arg === "string") {
        if (seen.has(arg)) continue;
        seen.add(arg);
        const store = arg.startsWith("g_") ? page.commonObjs : page.objs;
        image = await new Promise<PdfjsImage>((resolve) => store.get(arg, resolve));
      } else image = arg as PdfjsImage;
      if (!image || image.width < options.minSide || image.height < options.minSide) continue;
      // The same image object drawn through two names (or on two pages).
      if (image.ref) {
        if (seen.has(image.ref)) continue;
        seen.add(image.ref);
      }
      const jpeg = image.ref ? options.jpegs[image.ref] : undefined;
      out.push({
        page: n,
        index: ++index,
        type: jpeg ? "jpg" : "png",
        bytes: jpeg ?? (await options.encodePng(image)),
        width: image.width,
        height: image.height,
      });
      image.bitmap?.close?.();
    }
    page.cleanup();
    options.onProgress?.(n / doc.numPages);
  }
  if (!out.length) throw new ConversionError("pdfHasNoImages");
  return out;
}
