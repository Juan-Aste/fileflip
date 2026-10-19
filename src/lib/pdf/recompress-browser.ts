// Browser/worker implementation of the PDF image recompressor.
import { computeSize } from "@/lib/image/dimensions";
import type { Recompressor } from "./compress";

function toRgba(data: Uint8Array, gray: boolean, pixels: number) {
  const out = new Uint8ClampedArray(pixels * 4);
  for (let i = 0; i < pixels; i++) {
    const s = gray ? i : i * 3;
    out[i * 4] = data[s];
    out[i * 4 + 1] = data[gray ? s : s + 1];
    out[i * 4 + 2] = data[gray ? s : s + 2];
    out[i * 4 + 3] = 255;
  }
  return out;
}

export const browserRecompress: Recompressor = async (image, { maxSide, quality }) => {
  const bitmap =
    image.kind === "jpeg"
      ? // PDF viewers ignore EXIF orientation, so we must too.
        await createImageBitmap(new Blob([image.bytes.slice()], { type: "image/jpeg" }), { imageOrientation: "none" })
      : await createImageBitmap(
          new ImageData(toRgba(image.data, image.gray, image.width * image.height), image.width, image.height),
        );
  const size = computeSize(bitmap, { mode: "fit", width: maxSide, height: maxSide });
  const canvas = new OffscreenCanvas(size.width, size.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const { default: encode } = await import("@jsquash/jpeg/encode");
  // mozjpeg color spaces: 1 = grayscale, 3 = YCbCr.
  const color_space = (image.gray ? 1 : 3) as never;
  const bytes = await encode(ctx.getImageData(0, 0, size.width, size.height), { quality, color_space });
  return { bytes: new Uint8Array(bytes), ...size };
};
