// Resize requests of the "Resize image" tool turned into a drawing plan for a
// canvas: output size, the source rectangle and where it lands. Pure, so the
// geometry is tested without a browser.
import { MAX_SIDE, computeSize, coverCrop, type Size } from "./dimensions";

export type ResizeRequest =
  | { kind: "percent"; percent: number }
  /** Missing sides follow the aspect ratio; `keepRatio: false` stretches to exactly width × height. */
  | { kind: "pixels"; width?: number; height?: number; keepRatio: boolean; enlarge: boolean }
  /** A fixed box (social media sizes): crop to fill it, or fit inside with borders. */
  | { kind: "box"; width: number; height: number; fit: "crop" | "pad" };

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizePlan {
  size: Size;
  source: Rect;
  target: Rect;
  /** Borders around the picture ("pad"): the canvas is filled first. */
  padded: boolean;
}

/** Output cap (~36 MP, 144 MB of pixels): bigger results are scaled down to fit. */
export const MAX_OUTPUT_PIXELS = 36_000_000;

export const MIN_PERCENT = 1;
export const MAX_PERCENT = 400;

/** Common sizes of social networks (pixels), as of 2026. */
export const socialPresets = [
  { id: "instagramSquare", width: 1080, height: 1080 },
  { id: "instagramPortrait", width: 1080, height: 1350 },
  { id: "story", width: 1080, height: 1920 },
  { id: "facebookPost", width: 1200, height: 630 },
  { id: "facebookCover", width: 851, height: 315 },
  { id: "xPost", width: 1600, height: 900 },
  { id: "xHeader", width: 1500, height: 500 },
  { id: "youtubeThumbnail", width: 1280, height: 720 },
  { id: "linkedinBanner", width: 1584, height: 396 },
  { id: "profilePhoto", width: 800, height: 800 },
] as const;

export type SocialPresetId = (typeof socialPresets)[number]["id"];

const positive = (n: number | undefined) => (n !== undefined && Number.isFinite(n) && n >= 1 ? Math.round(n) : undefined);

/**
 * Null when the request has nothing to resize to (no side given, out of
 * range). Results beyond MAX_OUTPUT_PIXELS keep their shape but get smaller.
 */
export function planResize(image: Size, request: ResizeRequest): ResizePlan | null {
  const plan = rawPlan(image, request);
  if (!plan) return null;
  const pixels = plan.size.width * plan.size.height;
  if (pixels <= MAX_OUTPUT_PIXELS) return plan;
  const f = Math.sqrt(MAX_OUTPUT_PIXELS / pixels);
  const scale = (n: number) => Math.max(1, Math.floor(n * f));
  return {
    ...plan,
    size: { width: scale(plan.size.width), height: scale(plan.size.height) },
    target: { x: Math.floor(plan.target.x * f), y: Math.floor(plan.target.y * f), width: scale(plan.target.width), height: scale(plan.target.height) },
  };
}

function rawPlan(image: Size, request: ResizeRequest): ResizePlan | null {
  const whole: Rect = { x: 0, y: 0, width: image.width, height: image.height };
  const simple = (size: Size): ResizePlan => ({ size, source: whole, target: { x: 0, y: 0, ...size }, padded: false });

  if (request.kind === "percent") {
    if (!(request.percent >= MIN_PERCENT && request.percent <= MAX_PERCENT)) return null;
    return simple(computeSize(image, { mode: "percent", percent: request.percent }));
  }

  if (request.kind === "pixels") {
    const width = positive(request.width);
    const height = positive(request.height);
    if (!width && !height) return null;
    if (request.keepRatio || !width || !height) {
      return simple(computeSize(image, { mode: "fit", width, height }, { upscale: request.enlarge || !request.keepRatio }));
    }
    const cap = Math.min(1, MAX_SIDE / Math.max(width, height));
    return simple({ width: Math.max(1, Math.round(width * cap)), height: Math.max(1, Math.round(height * cap)) });
  }

  const size = computeSize(image, { mode: "cover", width: request.width, height: request.height });
  if (request.fit === "crop") {
    return { size, source: coverCrop(image, size), target: { x: 0, y: 0, ...size }, padded: false };
  }
  const scale = Math.min(size.width / image.width, size.height / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  return {
    size,
    source: whole,
    target: { x: Math.floor((size.width - width) / 2), y: Math.floor((size.height - height) / 2), width, height },
    padded: width !== size.width || height !== size.height,
  };
}
