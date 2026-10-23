// PDF page operations with pdf-lib. Pure functions over bytes, so they run in
// the PDF worker and in tests alike.
import { degrees, PDFDocument } from "pdf-lib";

export type Progress = (progress: number) => void;

async function load(bytes: Uint8Array) {
  // pdf-lib can read the structure of an encrypted PDF but not its streams:
  // the PDF worker decrypts inputs first (withoutEncryption, B-18).
  return PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
}

async function save(doc: PDFDocument) {
  doc.setProducer("Fileflect");
  doc.setCreator("Fileflect");
  return doc.save({ useObjectStreams: true });
}

export async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await load(bytes)).getPageCount();
}

/** Merges documents in the given order. */
export async function mergePdfs(files: readonly Uint8Array[], onProgress?: Progress): Promise<Uint8Array> {
  const out = await PDFDocument.create({ updateMetadata: false });
  for (const [i, bytes] of files.entries()) {
    const src = await load(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((page) => out.addPage(page));
    onProgress?.((i + 1) / files.length);
  }
  return save(out);
}

/** Copies the given pages (0-based, in order) of a loaded document into a new one. */
async function extract(src: PDFDocument, indices: readonly number[]) {
  const out = await PDFDocument.create({ updateMetadata: false });
  const pages = await out.copyPages(src, [...indices]);
  pages.forEach((page) => out.addPage(page));
  return save(out);
}

/** One output document per group of 0-based page indices. */
export async function splitPdf(
  bytes: Uint8Array,
  groups: readonly (readonly number[])[],
  onProgress?: Progress,
): Promise<Uint8Array[]> {
  const src = await load(bytes);
  const outputs: Uint8Array[] = [];
  for (const [i, group] of groups.entries()) {
    outputs.push(await extract(src, group));
    onProgress?.((i + 1) / groups.length);
  }
  return outputs;
}

export type Rotation = 90 | 180 | 270;

/** Rotates pages clockwise (all pages when `pages` is omitted), on top of their current rotation. */
export async function rotatePdf(
  bytes: Uint8Array,
  rotation: Rotation,
  pages?: readonly number[],
): Promise<Uint8Array> {
  const doc = await load(bytes);
  const targets = pages ?? doc.getPageIndices();
  for (const index of targets) {
    const page = doc.getPage(index);
    page.setRotation(degrees((page.getRotation().angle + rotation) % 360));
  }
  return save(doc);
}

export interface PageSpec {
  /** 0-based page in the source document. */
  index: number;
  /** Extra clockwise rotation. */
  rotation: 0 | Rotation;
}

/** Rebuilds a document with pages reordered, rotated or removed. */
export async function organizePdf(bytes: Uint8Array, specs: readonly PageSpec[]): Promise<Uint8Array> {
  if (!specs.length) throw new Error("A PDF needs at least one page");
  const src = await load(bytes);
  const out = await PDFDocument.create({ updateMetadata: false });
  const pages = await out.copyPages(src, specs.map((s) => s.index));
  pages.forEach((page, i) => {
    page.setRotation(degrees((page.getRotation().angle + specs[i].rotation) % 360));
    out.addPage(page);
  });
  return save(out);
}

export type PageSize = "fit" | "a4" | "letter";

const PAGE_SIZES: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

export interface PdfImage {
  bytes: Uint8Array;
  type: "jpg" | "png";
}

/**
 * One image per page. "fit" makes each page the image's size (at 72 DPI-ish
 * points); A4/Letter pick the orientation that matches the image and center it.
 */
export async function imagesToPdf(
  images: readonly PdfImage[],
  { pageSize = "fit", margin = 0 }: { pageSize?: PageSize; margin?: number } = {},
  onProgress?: Progress,
): Promise<Uint8Array> {
  if (!images.length) throw new Error("No images");
  const doc = await PDFDocument.create({ updateMetadata: false });
  for (const [i, image] of images.entries()) {
    const embedded = image.type === "jpg" ? await doc.embedJpg(image.bytes) : await doc.embedPng(image.bytes);
    const { width, height } = embedded;
    let pageW = width + margin * 2;
    let pageH = height + margin * 2;
    if (pageSize !== "fit") {
      const [short, long] = PAGE_SIZES[pageSize];
      [pageW, pageH] = width > height ? [long, short] : [short, long];
    }
    const scale = Math.min(1, (pageW - margin * 2) / width, (pageH - margin * 2) / height);
    const page = doc.addPage([pageW, pageH]);
    page.drawImage(embedded, {
      x: (pageW - width * scale) / 2,
      y: (pageH - height * scale) / 2,
      width: width * scale,
      height: height * scale,
    });
    onProgress?.((i + 1) / images.length);
  }
  return save(doc);
}
