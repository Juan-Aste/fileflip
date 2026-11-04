// Tiled inference for the upscaler: cut, run, stitch. Independent of
// onnxruntime (the runner is passed in) so it is tested in Node.
import type { RawImage } from "@/lib/image/pixels";

export interface Tile {
  /** The part of the output this tile writes (input pixels). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** The region actually run: the tile plus up to `pad` pixels around it, inside the image. */
  rx: number;
  ry: number;
  rwidth: number;
  rheight: number;
}

/** Tiles covering a width × height image, row by row. */
export function planTiles(width: number, height: number, tile: number, pad: number): Tile[] {
  const tiles: Tile[] = [];
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      const w = Math.min(tile, width - x);
      const h = Math.min(tile, height - y);
      const rx = Math.max(0, x - pad);
      const ry = Math.max(0, y - pad);
      tiles.push({ x, y, width: w, height: h, rx, ry, rwidth: Math.min(width, x + w + pad) - rx, rheight: Math.min(height, y + h + pad) - ry });
    }
  }
  return tiles;
}

/** RGB of a region as planar float32 in [0, 1] (NCHW without the batch). */
export function regionToPlanar(image: RawImage, rx: number, ry: number, w: number, h: number): Float32Array {
  const out = new Float32Array(3 * w * h);
  const plane = w * h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((ry + y) * image.width + rx + x) * 4;
      const p = y * w + x;
      out[p] = image.data[i]! / 255;
      out[plane + p] = image.data[i + 1]! / 255;
      out[2 * plane + p] = image.data[i + 2]! / 255;
    }
  }
  return out;
}

/** Runs the network on a planar RGB region of w × h; returns planar RGB of (w·scale) × (h·scale). */
export type TileRunner = (input: Float32Array, width: number, height: number) => Promise<Float32Array>;

export interface UpscaleOptions {
  scale: number;
  tile: number;
  pad: number;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

/** Enlarges the RGB of `image` by `scale` tile by tile; alpha is set to 255 (callers handle transparency). */
export async function upscaleTiled(image: RawImage, run: TileRunner, { scale, tile, pad, onProgress, signal }: UpscaleOptions): Promise<RawImage> {
  const width = image.width * scale;
  const height = image.height * scale;
  const out = new Uint8ClampedArray(width * height * 4);
  const tiles = planTiles(image.width, image.height, tile, pad);
  for (let t = 0; t < tiles.length; t++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { x, y, width: w, height: h, rx, ry, rwidth, rheight } = tiles[t]!;
    const result = await run(regionToPlanar(image, rx, ry, rwidth, rheight), rwidth, rheight);
    const ow = rwidth * scale;
    const plane = ow * rheight * scale;
    if (result.length !== 3 * plane) throw new Error(`tile output has ${result.length} values, expected ${3 * plane}`);
    // Copy the center (the tile without its padding).
    const offX = (x - rx) * scale;
    const offY = (y - ry) * scale;
    for (let yy = 0; yy < h * scale; yy++) {
      const src = (offY + yy) * ow + offX;
      let dst = ((y * scale + yy) * width + x * scale) * 4;
      for (let xx = 0; xx < w * scale; xx++, dst += 4) {
        // Uint8ClampedArray rounds and clamps the [0, 1] floats.
        out[dst] = result[src + xx]! * 255;
        out[dst + 1] = result[plane + src + xx]! * 255;
        out[dst + 2] = result[2 * plane + src + xx]! * 255;
        out[dst + 3] = 255;
      }
    }
    onProgress?.(t + 1, tiles.length);
  }
  return { data: out, width, height };
}
