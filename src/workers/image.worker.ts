/// <reference lib="webworker" />
import { decoderWarmers, encoderWarmers, encoders } from "@/lib/image/codecs";
import { decodeImage } from "@/lib/image/decode";
import { resizeRaw } from "@/lib/image/canvas";
import { computeSize, coverCrop, isSameSize, type Resize } from "@/lib/image/dimensions";
import type { RawImage } from "@/lib/image/pixels";
import type { ImageJob, ImageWorkerMessage, ImageWorkerRequest } from "./protocol";

const post = (msg: ImageWorkerMessage, transfer: Transferable[] = []) =>
  self.postMessage(msg, transfer);

/** Native decoding first (fast, handles most formats), WASM as fallback. */
async function decode(job: ImageJob): Promise<RawImage> {
  // Already rasterized on the main thread (SVG).
  if (job.pixels) {
    return { ...job.pixels, data: new Uint8ClampedArray(job.buffer) };
  }
  return decodeImage(job.buffer, job.from);
}

async function resize(image: RawImage, request: Resize | undefined): Promise<RawImage> {
  const target = computeSize(image, request ?? { mode: "none" });
  if (request?.mode === "cover") return resizeRaw(image, target, coverCrop(image, target));
  return isSameSize(image, target) ? image : resizeRaw(image, target);
}

/** Codecs being preloaded; a job waits for them instead of loading twice. */
const warming = new Map<string, Promise<unknown>>();

function warm(key: string, load: (() => Promise<unknown>) | undefined) {
  if (!load || warming.has(key)) return;
  // A failed preload is not an error: the job loads the codec itself.
  warming.set(key, load().catch(() => undefined));
}

self.onmessage = async (event: MessageEvent<ImageWorkerRequest>) => {
  const request = event.data;
  if ("type" in request) {
    if (request.to) warm(`enc:${request.to}`, encoderWarmers[request.to]);
    if (request.from) warm(`dec:${request.from}`, decoderWarmers[request.from]);
    return;
  }
  const job = request;
  try {
    const encoder = encoders[job.to];
    if (!encoder) throw new Error(`No encoder for ${job.to}`);
    await warming.get(`enc:${job.to}`);
    post({ id: job.id, type: "progress", progress: 0.1 });
    const image = await resize(await decode(job), job.options.resize);
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
