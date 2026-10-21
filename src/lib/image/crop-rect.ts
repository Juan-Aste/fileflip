// Geometry of the crop tool, in pixels of the image as shown (EXIF orientation
// applied). Rectangles are always whole pixels, inside the image, at least
// MIN_CROP pixels per side, and keep the aspect ratio when one is set.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export const MIN_CROP = 8;

export const aspectPresets = [
  { id: "free", ratio: null },
  { id: "original", ratio: null },
  { id: "1:1", ratio: 1 },
  { id: "4:3", ratio: 4 / 3 },
  { id: "3:4", ratio: 3 / 4 },
  { id: "16:9", ratio: 16 / 9 },
  { id: "9:16", ratio: 9 / 16 },
  { id: "3:2", ratio: 3 / 2 },
  { id: "4:5", ratio: 4 / 5 },
] as const;

export type AspectId = (typeof aspectPresets)[number]["id"];

/** Width / height for a preset, or null when free. */
export function aspectRatio(id: AspectId, image: Size): number | null {
  if (id === "original") return image.width / image.height;
  return aspectPresets.find((p) => p.id === id)?.ratio ?? null;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Size with the given ratio for a wanted width, shrunk to fit `max`. */
function sizeWithRatio(width: number, ratio: number, max: Size): Size {
  let w = Math.min(width, max.width, max.height * ratio);
  w = Math.max(w, Math.min(MIN_CROP, max.width), Math.min(MIN_CROP * ratio, max.width));
  w = Math.min(w, max.width, max.height * ratio);
  return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(w / ratio)) };
}

/** The biggest centered rectangle with the ratio (the whole image when free). */
export function fitAspect(image: Size, ratio: number | null): Rect {
  if (!ratio) return { x: 0, y: 0, width: image.width, height: image.height };
  const size = sizeWithRatio(image.width, ratio, image);
  return {
    x: Math.floor((image.width - size.width) / 2),
    y: Math.floor((image.height - size.height) / 2),
    ...size,
  };
}

/** Moves without resizing, stopping at the edges. */
export function moveRect(rect: Rect, dx: number, dy: number, image: Size): Rect {
  return {
    ...rect,
    x: Math.round(clamp(rect.x + dx, 0, image.width - rect.width)),
    y: Math.round(clamp(rect.y + dy, 0, image.height - rect.height)),
  };
}

export type Corner = "nw" | "ne" | "sw" | "se";

/**
 * Drags a corner by (dx, dy); the opposite corner stays put. With a ratio,
 * the width leads and the height follows.
 */
export function resizeCorner(rect: Rect, corner: Corner, dx: number, dy: number, ratio: number | null, image: Size): Rect {
  const west = corner === "nw" || corner === "sw";
  const north = corner === "nw" || corner === "ne";
  // The fixed corner and how much room there is from it towards the dragged one.
  const fixedX = west ? rect.x + rect.width : rect.x;
  const fixedY = north ? rect.y + rect.height : rect.y;
  const room = { width: west ? fixedX : image.width - fixedX, height: north ? fixedY : image.height - fixedY };
  let width = clamp(rect.width + (west ? -dx : dx), Math.min(MIN_CROP, room.width), room.width);
  let height = clamp(rect.height + (north ? -dy : dy), Math.min(MIN_CROP, room.height), room.height);
  if (ratio) ({ width, height } = sizeWithRatio(width, ratio, room));
  width = Math.round(width);
  height = Math.round(height);
  return { x: west ? fixedX - width : fixedX, y: north ? fixedY - height : fixedY, width, height };
}

/**
 * Applies a typed value (x, y, width or height). Sizes keep the top-left
 * corner and the ratio; everything is clamped to the image.
 */
export function setField(rect: Rect, field: keyof Rect, value: number, ratio: number | null, image: Size): Rect {
  if (!Number.isFinite(value)) return rect;
  const v = Math.round(value);
  if (field === "x" || field === "y") return moveRect(rect, field === "x" ? v - rect.x : 0, field === "y" ? v - rect.y : 0, image);
  if (ratio) {
    const width = field === "width" ? v : v * ratio;
    // Not enough room from this corner: move it back so the size fits.
    const size = sizeWithRatio(width, ratio, image);
    const x = Math.min(rect.x, image.width - size.width);
    const y = Math.min(rect.y, image.height - size.height);
    return { x, y, ...size };
  }
  if (field === "width") {
    const width = clamp(v, Math.min(MIN_CROP, image.width), image.width);
    return { ...rect, x: Math.min(rect.x, image.width - width), width };
  }
  const height = clamp(v, Math.min(MIN_CROP, image.height), image.height);
  return { ...rect, y: Math.min(rect.y, image.height - height), height };
}

/** True when the rectangle can be cut from the image as is. */
export function isValidCrop(rect: Rect, image: Size): boolean {
  return (
    [rect.x, rect.y, rect.width, rect.height].every(Number.isInteger) &&
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.width >= 1 &&
    rect.height >= 1 &&
    rect.x + rect.width <= image.width &&
    rect.y + rect.height <= image.height
  );
}
