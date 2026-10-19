export interface Size {
  width: number;
  height: number;
}

export type Resize =
  | { mode: "none" }
  | { mode: "percent"; percent: number }
  /** Fits inside a box keeping the aspect ratio; missing sides are unconstrained. */
  | { mode: "fit"; width?: number; height?: number }
  /** Exactly this size, cropping the center (e.g. a square ID photo). */
  | { mode: "cover"; width: number; height: number };

/** Hard cap so a typo (e.g. 100000 px) can't exhaust the device's memory. */
export const MAX_SIDE = 16384;

/**
 * Target size for a resize request. "fit" never upscales raster images;
 * vector sources (SVG) pass `upscale` since they stay sharp at any size.
 */
export function computeSize(source: Size, resize: Resize, { upscale = false } = {}): Size {
  if (resize.mode === "cover") {
    const cap = Math.min(1, MAX_SIDE / Math.max(resize.width, resize.height));
    return {
      width: Math.max(1, Math.round(resize.width * cap)),
      height: Math.max(1, Math.round(resize.height * cap)),
    };
  }
  let scale = 1;
  if (resize.mode === "percent") {
    scale = Math.max(1, Math.min(resize.percent, 400)) / 100;
  } else if (resize.mode === "fit") {
    const limits = [];
    if (resize.width && resize.width > 0) limits.push(resize.width / source.width);
    if (resize.height && resize.height > 0) limits.push(resize.height / source.height);
    if (limits.length) scale = Math.min(...limits, upscale ? Infinity : 1);
  }
  // Shrinks proportionally if the result would exceed the cap.
  scale = Math.min(scale, MAX_SIDE / Math.max(source.width, source.height));
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

export function isSameSize(a: Size, b: Size) {
  return a.width === b.width && a.height === b.height;
}

/** Centered source rectangle with the target's aspect ratio (for "cover"). */
export function coverCrop(source: Size, target: Size): { x: number; y: number; width: number; height: number } {
  const scale = Math.max(target.width / source.width, target.height / source.height);
  const width = Math.min(source.width, Math.round(target.width / scale));
  const height = Math.min(source.height, Math.round(target.height / scale));
  return { x: Math.floor((source.width - width) / 2), y: Math.floor((source.height - height) / 2), width, height };
}
