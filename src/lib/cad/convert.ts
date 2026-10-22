// "Convert DXF": one drawing → SVG, PNG or PDF. Runs in the CAD worker (workers/cad.worker.ts).
import { decodeText } from "@/lib/data/text";
import type { RenderText } from "@/lib/pdf/stamp";
import { parseDxf } from "./dxf";
import type { DxfPage, DxfPngWidth, DxfTarget } from "./options";
import { drawingToPdf } from "./pdf";
import { drawingToPng } from "./raster";
import { drawingToSvg } from "./svg";

export interface DxfRequest {
  to: DxfTarget;
  /** White background instead of transparent (SVG and PNG; a PDF page is white). */
  background: boolean;
  pngWidth: DxfPngWidth;
  page: DxfPage;
  /** Document title of the PDF (the file name). */
  title: string;
}

export interface DxfResult {
  data: Uint8Array;
  /** Shapes and texts drawn. */
  shapes: number;
  texts: number;
  /** Entity types left out, with how many of each. */
  skipped: Record<string, number>;
}

export async function convertDxf(bytes: Uint8Array, request: DxfRequest, renderText?: RenderText): Promise<DxfResult> {
  // DXF 2007+ is UTF-8; older files use the Windows code page (decodeText falls back to it).
  const drawing = parseDxf(decodeText(bytes));
  let data: Uint8Array;
  if (request.to === "svg") data = new TextEncoder().encode(drawingToSvg(drawing, { background: request.background }));
  else if (request.to === "png") data = await drawingToPng(drawing, { width: request.pngWidth, background: request.background });
  else data = (await drawingToPdf(drawing, { page: request.page, title: request.title, renderText })).data;
  return { data, shapes: drawing.paths.length, texts: drawing.texts.length, skipped: drawing.skipped };
}
