// Video → animated GIF: mediabunny decodes the frames at the chosen times
// (WebCodecs) and scales them on a canvas; gifenc (MIT) quantizes each frame
// to its own 256-color palette and writes the GIF. Runs in a worker.
import { CanvasSink } from "mediabunny";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { ConversionError } from "@/lib/convert-error";
import { validRange, type TrimRange } from "@/lib/audio/time";
import { openVideo } from "./convert";
import { gifFrameTimes, gifSize } from "./options";

export interface GifOptions {
  range: TrimRange;
  /** Maximum width in pixels (never enlarged). */
  width: number;
  fps: number;
  /** Repeat forever (else play once). */
  loop: boolean;
}

export interface GifResult {
  data: Uint8Array;
  width: number;
  height: number;
  frames: number;
}

export async function videoToGif(file: Blob, options: GifOptions, onProgress?: (progress: number) => void): Promise<GifResult> {
  const { input, video, duration } = await openVideo(file);
  try {
    if (!validRange(options.range, duration)) throw new ConversionError("videoRangeInvalid");
    const times = gifFrameTimes({ start: options.range.start, end: Math.min(options.range.end, duration) }, options.fps);
    if (!times) throw new ConversionError("gifTooManyFrames");
    if (!(await video.canDecode())) throw new ConversionError("videoCodecUnsupported");
    const { width, height } = gifSize(video.displayWidth, video.displayHeight, options.width);
    // Rotation metadata is applied by the sink, so phone videos stay upright.
    const sink = new CanvasSink(video, { width, height, fit: "fill", poolSize: 1 });
    const gif = GIFEncoder();
    const delay = Math.round(1000 / options.fps);
    let frames = 0;
    try {
      // Some files start a few milliseconds after 0 s: earlier times get the first frame.
      const first = await video.getFirstTimestamp();
      for await (const wrapped of sink.canvasesAtTimestamps(times.map((t) => Math.max(t, first)))) {
        if (!wrapped) continue;
        const ctx = (wrapped.canvas as OffscreenCanvas | HTMLCanvasElement).getContext("2d", { willReadFrequently: true }) as
          | OffscreenCanvasRenderingContext2D
          | CanvasRenderingContext2D
          | null;
        if (!ctx) throw new ConversionError("browserUnsupported");
        const { data } = ctx.getImageData(0, 0, width, height);
        const palette = quantize(data, 256);
        gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay, repeat: options.loop ? 0 : -1 });
        frames++;
        onProgress?.(frames / times.length);
      }
    } catch (error) {
      throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
    }
    if (frames === 0) throw new ConversionError("fileDamaged");
    gif.finish();
    return { data: gif.bytes(), width, height, frames };
  } finally {
    input.dispose();
  }
}
