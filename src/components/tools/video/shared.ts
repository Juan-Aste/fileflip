import { LEGACY_VIDEO_EXTENSIONS } from "@/lib/legacy-media/options";

/** Extensions the video tools accept (old formats go through the FFmpeg WASM fallback); the engine still checks the content. */
export const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "qt", "mkv", "webm", ...LEGACY_VIDEO_EXTENSIONS];

export type VideoSupport = "checking" | "full" | "noH264" | "none";

/** What this browser can do: WebCodecs at all, and H.264 encoding (missing where proprietary codecs aren't built in). */
export async function videoSupport(): Promise<Exclude<VideoSupport, "checking">> {
  if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") return "none";
  const avc = await VideoEncoder.isConfigSupported({ codec: "avc1.42001f", width: 1280, height: 720, bitrate: 2_000_000 }).catch(() => ({ supported: false }));
  return avc.supported ? "full" : "noH264";
}
