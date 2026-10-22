/// <reference lib="webworker" />
import { convertDxf, type DxfRequest } from "@/lib/cad/convert";
import type { RenderText } from "@/lib/pdf/stamp";
import { exposeHandlers } from "@/lib/worker-rpc";

/** PDF text Helvetica can't encode (Chinese, Cyrillic...) drawn with the device's fonts at 4× for print. */
const renderText: RenderText = async (text, size, [r, g, b]) => {
  const scale = 4;
  const font = `${size * scale}px Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif`;
  const measure = new OffscreenCanvas(1, 1).getContext("2d")!;
  measure.font = font;
  const width = Math.ceil(measure.measureText(text).width) + 2;
  const height = Math.ceil(size * scale * 1.25);
  const canvas = new OffscreenCanvas(Math.max(1, width), height);
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  ctx.fillStyle = `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 1, height / 2);
  const png = new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
  return { png, width: width / scale, height: height / scale };
};

// CAD drawings: parsing and flattening big DXF files stays off the main thread, and dxf-parser loads only here.
async function convert({ input, request }: { input: Blob; request: DxfRequest }) {
  const result = await convertDxf(new Uint8Array(await input.arrayBuffer()), request, renderText);
  return { result, transfer: [result.data.buffer] };
}

exposeHandlers({ convert });
