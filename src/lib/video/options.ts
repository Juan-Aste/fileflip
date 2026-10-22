// Video converter targets and how each one picks its codecs. No mediabunny
// import (types only): the page and the tests read these without the engine.
import type { AudioCodec, VideoCodec } from "mediabunny";

export const videoTargets = ["mp4", "webm", "mov", "mkv"] as const;
export type VideoTarget = (typeof videoTargets)[number];

/** Input and output are kept in memory, and the browser decodes and encodes every frame. */
export const MAX_VIDEO_SECONDS = 2 * 60 * 60;

interface TargetCodecs {
  /** Source codecs copied as they are (no quality loss, much faster). */
  copyVideo: readonly VideoCodec[];
  /** Encoders tried in order when the video must be re-encoded. */
  encodeVideo: readonly VideoCodec[];
  copyAudio: readonly AudioCodec[];
  encodeAudio: AudioCodec;
}

// MP4 is chosen to play everywhere: only H.264/HEVC are copied, the rest is
// encoded to H.264, or to VP9/AV1 when the browser has no H.264 encoder
// (Chromium without proprietary codecs): modern browsers and Android play
// them; the page says so. MOV is for Apple software, which only plays
// H.264/HEVC in it, so it has no fallback. WebM only holds VP8/VP9/AV1 with Opus/Vorbis.
const targetCodecs: Record<VideoTarget, TargetCodecs> = {
  mp4: { copyVideo: ["avc", "hevc"], encodeVideo: ["avc", "vp9", "av1"], copyAudio: ["aac", "mp3"], encodeAudio: "aac" },
  mov: { copyVideo: ["avc", "hevc", "prores"], encodeVideo: ["avc"], copyAudio: ["aac", "mp3"], encodeAudio: "aac" },
  webm: { copyVideo: ["vp9", "vp8", "av1"], encodeVideo: ["vp9", "vp8", "av1"], copyAudio: ["opus", "vorbis"], encodeAudio: "opus" },
  mkv: { copyVideo: ["avc", "hevc", "vp9", "vp8", "av1"], encodeVideo: ["avc", "vp9", "av1"], copyAudio: ["aac", "mp3", "opus", "vorbis", "flac"], encodeAudio: "opus" },
};

export interface VideoPlan {
  /** Output video codec; equal to the source codec when the packets are copied. */
  video: VideoCodec;
  copyVideo: boolean;
  audio?: AudioCodec;
  copyAudio: boolean;
}

/**
 * Codecs for a conversion: copy each track when the target container takes its
 * codec, else the first encoder this browser has (`encodable`); null when no
 * video encoder fits (the error says which browser to use).
 */
export function videoPlan(
  target: VideoTarget,
  source: { video: VideoCodec | null; audio: AudioCodec | null },
  encodable: (codec: VideoCodec) => boolean,
  /** The picture changes (compression, size...): the video is always encoded. */
  reencode = false,
): VideoPlan | null {
  const c = targetCodecs[target];
  const copyVideo = !reencode && source.video !== null && c.copyVideo.includes(source.video);
  const video = copyVideo ? source.video : c.encodeVideo.find(encodable);
  if (!video) return null;
  const copyAudio = source.audio !== null && c.copyAudio.includes(source.audio);
  return { video, copyVideo, copyAudio, ...(source.audio === null ? {} : { audio: copyAudio ? source.audio : c.encodeAudio }) };
}

/** Video encoders a target may need, in the order they are tried. */
export const encodersFor = (target: VideoTarget): readonly VideoCodec[] => targetCodecs[target].encodeVideo;

export const videoExtension: Record<VideoTarget, string> = { mp4: "mp4", webm: "webm", mov: "mov", mkv: "mkv" };
export const videoMime: Record<VideoTarget, string> = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mkv: "video/x-matroska" };

/** "Compress video" levels, mapped to mediabunny's quality presets (bitrate by resolution and codec). */
export const videoQualities = ["high", "medium", "low"] as const;
export type VideoQuality = (typeof videoQualities)[number];

/** Resolutions offered by "Compress video": the shorter side, so vertical phone videos count too. */
export const videoResolutions = [1080, 720, 480, 360] as const;

/**
 * Output size so the shorter side is at most `maxShortSide` (never enlarged),
 * keeping the aspect ratio with even dimensions (what H.264/VP9 encoders need).
 */
export function scaledSize(width: number, height: number, maxShortSide?: number): { width: number; height: number } {
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const scale = maxShortSide ? Math.min(1, maxShortSide / Math.min(width, height)) : 1;
  return { width: even(width * scale), height: even(height * scale) };
}

/** "Video to GIF": widths and frame rates offered, and the frame cap (each frame is a full image in memory). */
export const gifWidths = [240, 320, 480, 640] as const;
export const gifFrameRates = [5, 10, 15] as const;
export const MAX_GIF_FRAMES = 300;

/** Times (seconds) of the frames of a GIF of `range` at `fps`; null when it would exceed the frame cap. */
export function gifFrameTimes(range: { start: number; end: number }, fps: number): number[] | null {
  const count = Math.max(1, Math.round((range.end - range.start) * fps));
  if (count > MAX_GIF_FRAMES) return null;
  return Array.from({ length: count }, (_, i) => range.start + i / fps);
}

/** GIF size for a video `width`×`height` shown at most `maxWidth` wide (never enlarged). */
export function gifSize(width: number, height: number, maxWidth: number) {
  const scale = Math.min(1, maxWidth / width);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

