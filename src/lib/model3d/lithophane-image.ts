// The image side of "Image to lithophane": decodes the picture with the
// browser (createImageBitmap, in the worker), scales it to the plate's grid
// and turns it into grey levels for lithophaneStl.
import { ConversionError } from "@/lib/convert-error";
import { LITHOPHANE_BORDER_MM, lithophanePlan, lithophaneStl, lithophaneTriangles } from "./lithophane";

export interface LithophaneRequest {
  plateMm: number;
  pixelMm: number;
  minMm: number;
  maxMm: number;
  border: boolean;
}

export interface LithophaneResult {
  data: Uint8Array;
  widthMm: number;
  heightMm: number;
  triangles: number;
}

export async function imageToLithophane(input: Blob, request: LithophaneRequest, onProgress?: (progress: number) => void): Promise<LithophaneResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(input);
  } catch {
    throw new ConversionError("fileDamaged");
  }
  const plan = lithophanePlan(bitmap.width, bitmap.height, request.plateMm, request.pixelMm);
  const canvas = new OffscreenCanvas(plan.columns, plan.rows);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new ConversionError("browserUnsupported");
  // Transparent areas count as white (thinnest).
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, plan.columns, plan.rows);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, plan.columns, plan.rows);
  bitmap.close();
  const { data } = ctx.getImageData(0, 0, plan.columns, plan.rows);
  const gray = new Float32Array(plan.columns * plan.rows);
  for (let i = 0; i < gray.length; i++) gray[i] = (0.2126 * data[i * 4]! + 0.7152 * data[i * 4 + 1]! + 0.0722 * data[i * 4 + 2]!) / 255;
  onProgress?.(0.4);
  const stl = lithophaneStl(gray, plan.columns, plan.rows, {
    pixelMm: plan.pixelMm,
    minMm: request.minMm,
    maxMm: request.maxMm,
    borderPx: request.border ? Math.max(1, Math.round(LITHOPHANE_BORDER_MM / plan.pixelMm)) : 0,
  });
  onProgress?.(1);
  return { data: stl, widthMm: (plan.columns - 1) * plan.pixelMm, heightMm: (plan.rows - 1) * plan.pixelMm, triangles: lithophaneTriangles(plan.columns, plan.rows) };
}
