// PDF page operations with pdf-lib. Pure functions over bytes, so they run in
// the PDF worker and in tests alike.
import { PDFDocument } from "pdf-lib";

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
