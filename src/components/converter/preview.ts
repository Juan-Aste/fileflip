import { formats, type FormatId } from "@/config/formats";

// Formats every current browser can show in an <img>.
const previewable = new Set<FormatId>(["jpg", "png", "webp", "avif", "gif", "bmp", "ico", "svg"]);
const previewableMimes = new Set([...previewable].map((id) => formats[id].mime));

/** Originals bigger than this get an icon instead of a thumbnail (decoding costs memory). */
export const MAX_PREVIEW_BYTES = 25 * 1024 * 1024;

/**
 * What the file card thumbnail shows: the converted result when it is an image
 * the browser can draw, else the original, else nothing (a format icon).
 */
export function previewSource(
  format: FormatId | null | undefined,
  size: number,
  result?: { type: string },
): "result" | "original" | null {
  if (result && previewableMimes.has(result.type)) return "result";
  if (format && previewable.has(format) && size <= MAX_PREVIEW_BYTES) return "original";
  return null;
}
