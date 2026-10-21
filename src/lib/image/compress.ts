// Image compression settings and the target-size search, kept free of codecs
// so the UI can import them and tests can drive them with fake encoders.

export type CompressionLevel = "low" | "medium" | "high";

/** Outputs the compressor writes; "png" is only kept for PNG inputs in level mode. */
export type CompressFormat = "jpg" | "png" | "webp" | "avif";

export const compressInputs: readonly CompressFormat[] = ["jpg", "png", "webp", "avif"];

/** Encoder quality (1–100) per level for lossy formats. */
const qualities: Record<CompressionLevel, number> = { low: 82, medium: 68, high: 50 };

export const levelQuality = (level: CompressionLevel) => qualities[level];

/**
 * PNG stays lossless at "low" (only better compression); "medium" and "high"
 * reduce it to a palette, which is where PNG sizes really drop.
 */
export function pngColors(level: CompressionLevel): number | null {
  return level === "low" ? null : level === "medium" ? 256 : 64;
}

/** One-click targets asked by government and job forms (bytes). */
export const targetPresets = [50, 100, 200, 500, 1000].map((kb) => kb * 1000);

/** Smallest target accepted: below this no photo stays recognizable. */
export const MIN_TARGET_BYTES = 10_000;
/** The image is never shrunk below this many pixels on its longest side. */
export const MIN_SIDE = 160;

/** Below this quality JPEG/WEBP artifacts get ugly: shrinking looks better. */
const FLOOR_QUALITY = 40;
/** Last resort, once the image is at its smallest allowed size. */
const MIN_QUALITY = 5;
const MAX_QUALITY = 92;
/** Shrinking steps tried after the lowest quality is still too big. */
const MAX_SCALE_STEPS = 6;

/** Output format for a target-size run: PNG can't be tuned by quality, so it becomes JPG. */
export function targetFormat(input: CompressFormat, requested: CompressFormat | "same"): Exclude<CompressFormat, "png"> {
  const format = requested === "same" ? input : requested;
  return format === "png" ? "jpg" : format;
}

export interface Encoded {
  bytes: ArrayBuffer;
  quality: number;
  /** Scale applied to both sides (1 = original size). */
  scale: number;
}

export type EncodeAt = (quality: number, scale: number) => Promise<ArrayBuffer>;

/**
 * Finds the highest quality whose file fits in `target` bytes (binary search,
 * about 7 encodes). When even a modest quality (40) is too big, the image is
 * shrunk step by step (by the square root of the size ratio, since bytes
 * follow the pixel count) and searched again; at `minScale` the quality may
 * go down to 5. Returns null when the target still can't be met.
 */
export async function fitToTarget(
  encodeAt: EncodeAt,
  target: number,
  { minScale = 0, onStep }: { minScale?: number; onStep?: (step: number) => void } = {},
): Promise<Encoded | null> {
  let scale = 1;
  let step = 0;
  for (let round = 0; round <= MAX_SCALE_STEPS; round++) {
    let low = scale <= minScale ? MIN_QUALITY : FLOOR_QUALITY;
    let high = MAX_QUALITY;
    let best: Encoded | null = null;
    // Try the lowest quality first: if it doesn't fit, searching is pointless.
    const floor = await encodeAt(low, scale);
    onStep?.(++step);
    if (floor.byteLength <= target) {
      best = { bytes: floor, quality: low, scale };
      low += 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const bytes = await encodeAt(mid, scale);
        onStep?.(++step);
        if (bytes.byteLength <= target) {
          best = { bytes, quality: mid, scale };
          low = mid + 1;
        } else high = mid - 1;
      }
      return best;
    }
    const next = scale * Math.min(0.9, Math.sqrt(target / floor.byteLength) * 0.95);
    if (next < minScale) {
      if (scale <= minScale) return null;
      scale = minScale;
    } else scale = next;
  }
  return null;
}

/** Smallest scale allowed so the longest side stays at MIN_SIDE (or the image's own size if smaller). */
export function minScaleFor(width: number, height: number) {
  const longest = Math.max(width, height);
  return longest <= MIN_SIDE ? 1 : MIN_SIDE / longest;
}

/** Saved fraction (0.42 = 42 % smaller); negative when the output is bigger. */
export const savedFraction = (before: number, after: number) => (before > 0 ? 1 - after / before : 0);
