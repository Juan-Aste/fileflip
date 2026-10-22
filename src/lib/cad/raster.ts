// A parsed DXF drawing → PNG, drawn on an OffscreenCanvas in the CAD worker
// with the same frame (margins, Y flip, line width) as the SVG.
import { ConversionError } from "@/lib/convert-error";
import type { Drawing } from "./dxf";
import { CAP_HEIGHT, frameOf } from "./svg";

export interface PngOptions {
  /** Pixels on the longest side. */
  width: number;
  background: boolean;
}

export async function drawingToPng(drawing: Drawing, options: PngOptions): Promise<Uint8Array> {
  if (typeof OffscreenCanvas === "undefined") throw new ConversionError("browserUnsupported");
  const frame = frameOf(drawing);
  const k = options.width / Math.max(frame.width, frame.height);
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(frame.width * k)), Math.max(1, Math.round(frame.height * k)));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ConversionError("browserUnsupported");
  if (options.background) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.lineWidth = Math.max(1, frame.line * k);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const path of drawing.paths) {
    ctx.strokeStyle = ctx.fillStyle = path.color;
    ctx.beginPath();
    if (path.points.length === 1) {
      const [x, y] = path.points[0]!;
      ctx.arc(frame.x(x) * k, frame.y(y) * k, ctx.lineWidth * 1.5, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    path.points.forEach(([x, y], i) => (i ? ctx.lineTo(frame.x(x) * k, frame.y(y) * k) : ctx.moveTo(frame.x(x) * k, frame.y(y) * k)));
    if (path.closed) ctx.closePath();
    if (path.fill) ctx.fill();
    ctx.stroke();
  }
  for (const t of drawing.texts) {
    ctx.save();
    ctx.translate(frame.x(t.x) * k, frame.y(t.y) * k);
    ctx.rotate(-t.rotation);
    ctx.fillStyle = t.color;
    ctx.font = `${(t.height / CAP_HEIGHT) * k}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = t.align === "start" ? "left" : t.align === "end" ? "right" : "center";
    ctx.textBaseline = t.baseline === "alphabetic" ? "alphabetic" : t.baseline === "middle" ? "middle" : "hanging";
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  }
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return new Uint8Array(await blob.arrayBuffer());
}
