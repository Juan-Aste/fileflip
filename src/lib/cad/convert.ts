// "Convert DXF": one drawing → SVG. Runs in the CAD worker (workers/cad.worker.ts).
import { decodeText } from "@/lib/data/text";
import { parseDxf } from "./dxf";
import type { DxfTarget } from "./options";
import { drawingToSvg } from "./svg";

export interface DxfRequest {
  to: DxfTarget;
  /** White background instead of transparent. */
  background: boolean;
}

export interface DxfResult {
  data: Uint8Array;
  /** Shapes and texts drawn. */
  shapes: number;
  texts: number;
  /** Entity types left out, with how many of each. */
  skipped: Record<string, number>;
}

export function convertDxf(bytes: Uint8Array, request: DxfRequest): DxfResult {
  // DXF 2007+ is UTF-8; older files use the Windows code page (decodeText falls back to it).
  const drawing = parseDxf(decodeText(bytes));
  const data = new TextEncoder().encode(drawingToSvg(drawing, { background: request.background }));
  return { data, shapes: drawing.paths.length, texts: drawing.texts.length, skipped: drawing.skipped };
}
