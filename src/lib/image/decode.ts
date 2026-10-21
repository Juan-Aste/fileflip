// Decoding for the image workers: native first (fast, handles most formats),
// the WASM decoders of codecs.ts as fallback.
import { formats, type FormatId } from "@/config/formats";
import { decoders } from "./codecs";
import type { RawImage } from "./pixels";

export async function decodeImage(buffer: ArrayBuffer, from: FormatId): Promise<RawImage> {
  try {
    const bitmap = await createImageBitmap(new Blob([buffer], { type: formats[from].mime }));
    try {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2D context");
      ctx.drawImage(bitmap, 0, 0);
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } finally {
      bitmap.close();
    }
  } catch (nativeError) {
    const decoder = decoders[from];
    if (!decoder) throw nativeError;
    return decoder(buffer);
  }
}
