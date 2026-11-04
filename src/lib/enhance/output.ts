import type { FormatId } from "@/config/formats";

export type EnhanceOutput = "jpg" | "png" | "webp";

/** JPG, PNG and WEBP keep their format; other inputs become PNG when they have transparency, else JPG. */
export function enhanceOutputFormat(from: FormatId, transparent: boolean): EnhanceOutput {
  if (from === "jpg" || from === "png" || from === "webp") return from;
  return transparent ? "png" : "jpg";
}

/** Quality of the lossy outputs: the result should not lose what the filters gained. */
export const ENHANCE_QUALITY = 92;

export const megapixels = (width: number, height: number) => (width * height) / 1_000_000;
