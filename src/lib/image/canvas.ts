// Canvas helpers for the image worker (OffscreenCanvas is available there).
import type { Size } from "./dimensions";
import type { RawImage } from "./pixels";

function context(size: Size) {
  const canvas = new OffscreenCanvas(size.width, size.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

const toBitmap = (image: RawImage) =>
  createImageBitmap(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height));

export async function resizeRaw(image: RawImage, size: Size): Promise<RawImage> {
  const source = await toBitmap(image);
  const ctx = context(size);
  ctx.drawImage(source, 0, 0, size.width, size.height);
  source.close();
  return ctx.getImageData(0, 0, size.width, size.height);
}

/** Scales the image to fit a transparent square, centered (for icons). */
export async function fitSquare(image: RawImage, side: number): Promise<RawImage> {
  const scale = side / Math.max(image.width, image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const source = await toBitmap(image);
  const ctx = context({ width: side, height: side });
  ctx.drawImage(source, Math.floor((side - width) / 2), Math.floor((side - height) / 2), width, height);
  source.close();
  return ctx.getImageData(0, 0, side, side);
}
