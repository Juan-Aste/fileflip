// The FFmpeg WASM fallback, tried only when mediabunny with the browser's
// WebCodecs can't read a file and the file looks like one of the old formats
// (AVI, WMV/WMA, FLV, MPEG-1/2, VOB, 3GP, RealMedia, AMR, AC-3). The core
// (~31 MB) loads only then. The rewritten file goes back through the normal
// mediabunny pipeline, which encodes the target format.
import { ConversionError } from "@/lib/convert-error";
import { LEGACY_AUDIO_EXTENSIONS, LEGACY_VIDEO_EXTENSIONS, looksLegacy, type LegacyKind } from "./options";

const fallbackCodes = new Set(["unsupportedFormat", "videoCodecUnsupported", "audioCodecUnsupported", "browserUnsupported"]);

export interface LegacyHooks {
  signal?: AbortSignal;
  onProgress?: (p: number) => void;
}

const extension = (file: Blob) => ("name" in file && typeof file.name === "string" ? (/\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase() ?? "") : "");

/** Whether `file` is worth handing to FFmpeg: an old container by its first bytes or by its name. */
export async function isLegacyFile(file: Blob): Promise<boolean> {
  if (looksLegacy(new Uint8Array(await file.slice(0, 512).arrayBuffer()))) return true;
  const ext = extension(file);
  return LEGACY_VIDEO_EXTENSIONS.includes(ext) || LEGACY_AUDIO_EXTENSIONS.includes(ext);
}

/**
 * After mediabunny failed on `file` with `error`: the file rewritten by FFmpeg
 * (WebM for video, WAV for audio), or null when the fallback doesn't apply.
 */
export async function legacyFallback(file: Blob, kind: LegacyKind, error: unknown, hooks: LegacyHooks = {}): Promise<Blob | null> {
  if (!(error instanceof ConversionError) || !fallbackCodes.has(error.code)) return null;
  // Without WebCodecs a video can't be re-encoded afterwards anyway.
  if (kind === "video" && typeof VideoDecoder === "undefined") return null;
  if (typeof Worker === "undefined" || typeof WebAssembly === "undefined") return null;
  if (!(await isLegacyFile(file))) return null;
  const { transcodeLegacy } = await import("./client");
  return transcodeLegacy(file, kind, hooks);
}

/**
 * Splits one progress bar between the fallback (first half, when it runs)
 * and the conversion after it (second half); without the fallback the
 * conversion gets the whole bar.
 */
export function splitProgress(onProgress?: (p: number) => void) {
  let used = false;
  return {
    legacy: (p: number) => {
      used = true;
      onProgress?.(p / 2);
    },
    rest: (p: number) => onProgress?.(used ? 0.5 + p / 2 : p),
  };
}
