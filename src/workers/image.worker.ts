/// <reference lib="webworker" />
import { formats } from "@/config/formats";
import { decoders, encoders } from "@/lib/image/codecs";
import type { RawImage } from "@/lib/image/pixels";
import type { ImageJob, ImageWorkerMessage } from "./protocol";

const post = (msg: ImageWorkerMessage, transfer: Transferable[] = []) =>
  self.postMessage(msg, transfer);

/** Native decoding first (fast, handles most formats), WASM as fallback. */
async function decode(job: ImageJob): Promise<RawImage> {
  try {
    const bitmap = await createImageBitmap(
      new Blob([job.buffer], { type: formats[job.from].mime }),
    );
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch (nativeError) {
    const decoder = decoders[job.from];
    if (!decoder) throw nativeError;
    return decoder(job.buffer);
  }
}

self.onmessage = async (event: MessageEvent<ImageJob>) => {
  const job = event.data;
  try {
    const encoder = encoders[job.to];
    if (!encoder) throw new Error(`No encoder for ${job.to}`);
    post({ id: job.id, type: "progress", progress: 0.1 });
    const image = await decode(job);
    post({ id: job.id, type: "progress", progress: 0.4 });
    const buffer = await encoder(image, job.options);
    post(
      { id: job.id, type: "done", buffer, width: image.width, height: image.height },
      [buffer],
    );
  } catch (error) {
    post({
      id: job.id,
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
