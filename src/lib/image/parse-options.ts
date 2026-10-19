import type { Resize } from "./dimensions";
import { DEFAULT_QUALITY, type ImageOptions } from "./options";

const positive = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : undefined;

/** Validates untrusted image options (e.g. from a request), dropping anything invalid. */
export function parseImageOptions(raw: unknown): ImageOptions {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const q = positive(input.quality);
  const quality = q ? Math.min(100, q) : DEFAULT_QUALITY;

  const r = (input.resize && typeof input.resize === "object" ? input.resize : {}) as Record<string, unknown>;
  let resize: Resize = { mode: "none" };
  if (r.mode === "percent" && positive(r.percent)) {
    resize = { mode: "percent", percent: Math.min(400, positive(r.percent)!) };
  } else if (r.mode === "fit" && (positive(r.width) || positive(r.height))) {
    resize = { mode: "fit", width: positive(r.width), height: positive(r.height) };
  }
  return { quality, resize };
}
