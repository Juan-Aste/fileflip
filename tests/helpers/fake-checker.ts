// Generated fixtures for the "fake transparency" tests: a logo drawn over the
// grey/white checkerboard editors show behind transparent pixels, saved as a
// JPEG (so the checkerboard is baked into the pixels). Used by the unit tests
// and by the browser tests (which validate the download with sharp).
import sharp from "sharp";

export type Rgb = [number, number, number];

export interface CheckerFixture {
  width: number;
  height: number;
  cell: number;
  /** Grid offset: pixel (x, y) is in cell ((x + ox) / cell, (y + oy) / cell). */
  ox?: number;
  oy?: number;
  colors?: [Rgb, Rgb];
  /** Draw a small checkerboard inside the logo (it must stay). */
  innerChecker?: boolean;
  /** Plain light background instead of the checkerboard. */
  plain?: Rgb;
}

/** 1 inside the logo, 0 outside, plus a second mask of the inner checkerboard. */
export function logoMasks(width: number, height: number, innerChecker = false) {
  const logo = new Uint8Array(width * height);
  const inner = new Uint8Array(width * height);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.3;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const inCircle = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r;
      // A bar sticking out to the right of the circle.
      const inBar = x >= cx && x < cx + r * 1.4 && Math.abs(y + 0.5 - cy) <= r * 0.18;
      if (inCircle || inBar) logo[y * width + x] = 1;
      if (innerChecker && Math.abs(x + 0.5 - cx) <= r * 0.45 && Math.abs(y + 0.5 - cy) <= r * 0.45) inner[y * width + x] = 1;
    }
  return { logo, inner };
}

/** Colour of the logo at (x, y): blue circle, red bar. */
function logoColor(x: number, y: number, width: number, height: number): Rgb {
  const r = Math.min(width, height) * 0.3;
  const inCircle = (x + 0.5 - width / 2) ** 2 + (y + 0.5 - height / 2) ** 2 <= r * r;
  return inCircle ? [30, 80, 200] : [210, 40, 50];
}

export const DEFAULT_COLORS: [Rgb, Rgb] = [
  [255, 255, 255],
  [204, 204, 204],
];

/** Raw RGBA of the fixture (before JPEG). */
export function checkerRgba(f: CheckerFixture): Uint8ClampedArray {
  const { width, height, cell, ox = 0, oy = 0, colors = DEFAULT_COLORS } = f;
  const { logo, inner } = logoMasks(width, height, f.innerChecker);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const k = (Math.floor((x + ox) / cell) + Math.floor((y + oy) / cell)) & 1;
      const checker = colors[k]!;
      const c = inner[p] ? checker : logo[p] ? logoColor(x, y, width, height) : (f.plain ?? checker);
      data.set([c[0], c[1], c[2], 255], p * 4);
    }
  return data;
}

/** The fixture as a JPEG of medium quality. */
export async function checkerJpeg(f: CheckerFixture, quality = 60): Promise<Buffer> {
  return sharp(Buffer.from(checkerRgba(f).buffer), { raw: { width: f.width, height: f.height, channels: 4 } })
    .jpeg({ quality })
    .toBuffer();
}

/** Decodes any image to RGBA (independent of the app's decoders). */
export async function rgbaOf(input: Buffer | string) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

/** Distance (in pixels, Chebyshev) from each pixel to the nearest pixel where mask differs. */
export function distanceToEdge(mask: Uint8Array, width: number, height: number, max = 8): Uint8Array {
  const dist = new Uint8Array(width * height).fill(max);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = mask[y * width + x];
      let best = max;
      for (let dy = -max; dy <= max && best > 0; dy++)
        for (let dx = -max; dx <= max; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (mask[ny * width + nx] !== v) best = Math.min(best, Math.max(Math.abs(dx), Math.abs(dy)) - 1);
        }
      dist[y * width + x] = Math.max(0, best);
    }
  return dist;
}
