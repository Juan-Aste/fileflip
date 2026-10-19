// PDF page operations with pdf-lib. Pure functions over bytes, so they run in
// the PDF worker and in tests alike.
import { degrees, PDFDocument } from "pdf-lib";

export type Progress = (progress: number) => void;

async function load(bytes: Uint8Array) {
  // Many real-world PDFs are "encrypted" with an empty user password (only
  // permissions set); pdf-lib can still copy their pages.
  return PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
}

async function save(doc: PDFDocument) {
  doc.setProducer("FileFlip");
  doc.setCreator("FileFlip");
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
