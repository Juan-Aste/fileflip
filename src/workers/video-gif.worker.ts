/// <reference lib="webworker" />
import { videoToGif, type GifOptions } from "@/lib/video/gif";
import { exposeHandlers } from "@/lib/worker-rpc";

// Video → GIF: decoding, scaling and quantizing every frame stays off the main thread.
async function makeGif({ input, options }: { input: Blob; options: GifOptions }, onProgress: (progress: number) => void) {
  const result = await videoToGif(input, options, onProgress);
  return { result, transfer: [result.data.buffer] };
}

exposeHandlers({ makeGif });
