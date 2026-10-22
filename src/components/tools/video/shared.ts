/** Extensions the video tools accept; the engine still checks the content. */
export const VIDEO_EXTENSIONS = ["mp4", "m4v", "mov", "qt", "mkv", "webm"];

export type VideoSupport = "checking" | "full" | "noH264" | "none";

/** What this browser can do: WebCodecs at all, and H.264 encoding (missing where proprietary codecs aren't built in). */
export async function videoSupport(): Promise<Exclude<VideoSupport, "checking">> {
  if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") return "none";
  const avc = await VideoEncoder.isConfigSupported({ codec: "avc1.42001f", width: 1280, height: 720, bitrate: 2_000_000 }).catch(() => ({ supported: false }));
  return avc.supported ? "full" : "noH264";
}
