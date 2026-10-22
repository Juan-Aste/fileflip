/// <reference lib="webworker" />
import { ConversionError } from "@/lib/convert-error";
import { READ_SIDES, decodeQr } from "@/lib/qr/read";
import { exposeHandlers } from "@/lib/worker-rpc";

// QR reading: decoding the photo and scanning its pixels stays off the main thread.
async function readQr({ input }: { input: Blob }, onProgress: (progress: number) => void) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(input);
  } catch {
    throw new ConversionError("fileDamaged");
  }
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const sides = [...READ_SIDES.filter((s) => s < longest), Math.min(longest, READ_SIDES.at(-1)!)];
    for (const [i, side] of [...new Set(sides)].entries()) {
      const scale = side / longest;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = new OffscreenCanvas(width, height).getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("No 2D context");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);
      const text = decodeQr(ctx.getImageData(0, 0, width, height).data, width, height);
      onProgress((i + 1) / sides.length);
      if (text !== null) return { result: text };
    }
    throw new ConversionError("qrNotFound");
  } finally {
    bitmap.close();
  }
}

exposeHandlers({ readQr });
