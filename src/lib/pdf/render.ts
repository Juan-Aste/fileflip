"use client";

// Page rendering with pdf.js. Parsing runs in pdf.js's own Web Worker; the
// legacy build supports older browsers (common on budget Android phones).
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ConversionError } from "@/lib/convert-error";

type Pdfjs = typeof import("pdfjs-dist");
let pdfjs: Promise<{ lib: Pdfjs; worker: InstanceType<Pdfjs["PDFWorker"]> }> | null = null;

function loadPdfjs() {
  pdfjs ??= import("pdfjs-dist/legacy/build/pdf.min.mjs").then((mod) => {
    const lib = mod as unknown as Pdfjs;
    const port = new Worker(new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
    // One worker for every document, passed explicitly: pdf.js then never
    // destroys it with a document. (With GlobalWorkerOptions.workerPort, the
    // first `loadingTask.destroy()` tore the shared worker down and a PDF
    // opened at the same time in a batch failed.)
    // (The bundled types say `port` must be null; a Worker is what pdf.js expects.)
    return { lib, worker: new lib.PDFWorker({ port: port as never }) };
  });
  return pdfjs;
}

/** Opens a PDF; one with an open password fails with `pdfPasswordRequired` (B-18). */
export async function openPdf(file: Blob): Promise<PDFDocumentProxy> {
  const { lib, worker } = await loadPdfjs();
  try {
    return await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), worker }).promise;
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") throw new ConversionError("pdfPasswordRequired");
    throw error;
  }
}

/**
 * Renders a page (0-based) to a canvas. `scale` 1 = 72 DPI; the result is
 * capped at `maxSide` pixels to stay within the device's canvas limits.
 */
export async function renderPage(
  doc: PDFDocumentProxy,
  index: number,
  {
    scale = 1,
    maxSide = 8000,
    background = "#ffffff",
  }: { scale?: number; maxSide?: number; background?: string } = {},
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(index + 1);
  const base = page.getViewport({ scale: 1 });
  const fit = Math.min(scale, maxSide / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale: fit });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  await page.render({ canvas, viewport, background }).promise;
  page.cleanup();
  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas export failed")),
      type,
      quality,
    ),
  );
}

/** Small JPEG thumbnail URL of a page (caller revokes it). */
export async function pageThumbnail(
  doc: PDFDocumentProxy,
  index: number,
  width = 180,
): Promise<string> {
  const page = await doc.getPage(index + 1);
  const scale = width / page.getViewport({ scale: 1 }).width;
  const canvas = await renderPage(doc, index, { scale, maxSide: width * 3 });
  return URL.createObjectURL(await canvasToBlob(canvas, "image/jpeg", 0.7));
}
