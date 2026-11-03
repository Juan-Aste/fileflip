// "Enhance photo", AI mode: x2 or x4 with the Real-ESRGAN network run tile by
// tile (tiles.ts). x4 is the network's own scale; x2 halves the x4 result with
// 2 × 2 averaging, which keeps its detail and removes most artifacts.
// Transparency is enlarged separately (bicubic), the network only sees RGB.
import type { RawImage } from "@/lib/image/pixels";
import { hasTransparency } from "@/lib/image/pixels";
import { bicubicUpscale, halve } from "./metrics";
import { MODEL_SCALE, PAD } from "./model";
import { upscaleTiled, type TileRunner } from "./tiles";

export type UpscaleFactor = 2 | 4;

export interface UpscaleImageOptions {
  tile: number;
  pad?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export async function upscaleImage(image: RawImage, factor: UpscaleFactor, run: TileRunner, { tile, pad = PAD, onProgress, signal }: UpscaleImageOptions): Promise<RawImage> {
  let out = await upscaleTiled(image, run, { scale: MODEL_SCALE, tile, pad, signal, onProgress: (done, total) => onProgress?.(done / total) });
  if (hasTransparency(image)) {
    const alpha = bicubicUpscale(image, MODEL_SCALE);
    for (let i = 3; i < out.data.length; i += 4) out.data[i] = alpha.data[i]!;
  }
  if (factor === 2) out = halve(out);
  return out;
}
