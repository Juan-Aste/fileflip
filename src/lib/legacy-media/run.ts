// Runs the FFmpeg WASM core (@ffmpeg/core, single-threaded) on one input file:
// first reads its duration from FFmpeg's log, checks the limit, then rewrites it
// into a format mediabunny reads (WebM with VP8 + Opus for video, 16-bit WAV for
// audio). Shared by the worker and the Node unit tests, which load the same core.
//
// Only royalty-free encoders run here (VP8, Opus, PCM); H.264/AAC/MP3 outputs are
// encoded afterwards by the existing mediabunny pipeline (the browser's encoders or
// the WASM encoders already in use), so the x264/x265 encoders in the build are never called.
import { LEGACY_MAX_AUDIO_SECONDS, LEGACY_MAX_VIDEO_SECONDS, legacyArgs, parseAudioShape, parseDuration, type LegacyKind } from "./options";

/** The part of the Emscripten module built by @ffmpeg/core that we use. */
export interface FFmpegCore {
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
    mkdir(path: string): void;
    mount(type: unknown, options: unknown, mountPoint: string): void;
    unmount(mountPoint: string): void;
    filesystems: Record<string, unknown>;
  };
  exec(...args: string[]): number;
  setLogger(logger: (log: { type: string; message: string }) => void): void;
  setProgress(handler: (event: { progress: number; time: number }) => void): void;
  setTimeout(ms: number): void;
  reset(): void;
}

/** Thrown with a ConversionError code as message (the worker protocol carries the message). */
export class LegacyError extends Error {}

export interface LegacyResult {
  data: Uint8Array;
  /** Duration of the input, in seconds (null when FFmpeg couldn't tell). */
  duration: number | null;
}

/**
 * Converts the file at `inputPath` (already in the core's file system) for `kind`.
 * `onProgress` gets 0–1 while converting.
 */
export function runLegacy(core: FFmpegCore, inputPath: string, kind: LegacyKind, onProgress: (p: number) => void = () => {}, timeoutMs = -1): LegacyResult {
  const log: string[] = [];
  core.setLogger(({ message }) => {
    // Only FFmpeg's own diagnostics are kept, and only for this run (never sent anywhere).
    if (log.length < 400) log.push(message);
  });
  // 1. Probe: `ffmpeg -i file` lists the streams and exits with an error (no output given).
  core.exec("-hide_banner", "-i", inputPath);
  core.reset();
  const text = log.join("\n");
  const hasVideo = /Stream #\d+:\d+.*: Video: (?!mjpeg|png|bmp)/.test(text);
  const hasAudio = /Stream #\d+:\d+.*: Audio: /.test(text);
  if (!/Input #0/.test(text) || (!hasVideo && !hasAudio)) throw new LegacyError(/Invalid data|could not find codec|Unknown format/i.test(text) || !/Input #0/.test(text) ? "unsupportedFormat" : "fileDamaged");
  if (kind === "video" && !hasVideo) throw new LegacyError("noVideoTrack");
  if (kind === "audio" && !hasAudio) throw new LegacyError("noAudioTrack");
  const duration = parseDuration(text);
  const max = kind === "video" ? LEGACY_MAX_VIDEO_SECONDS : LEGACY_MAX_AUDIO_SECONDS;
  if (duration !== null && duration > max) throw new LegacyError(kind === "video" ? "legacyVideoTooLong" : "legacyAudioTooLong");

  // 2. Convert. Without a known duration, stop one second past the limit and check.
  const output = kind === "video" ? "/out.webm" : "/out.wav";
  core.setProgress(({ time }) => {
    if (duration) onProgress(Math.min(1, Math.max(0, time / 1e6 / duration)));
  });
  log.length = 0;
  core.setTimeout(timeoutMs);
  const ret = core.exec(...legacyArgs(kind, inputPath, output, { limit: duration === null ? max + 1 : undefined, hasAudio, audio: parseAudioShape(text) }));
  core.reset();
  core.setProgress(() => {});
  let data: Uint8Array;
  try {
    data = core.FS.readFile(output);
    core.FS.unlink(output);
  } catch {
    throw new LegacyError(ret === 1 && log.some((l) => /timeout/i.test(l)) ? "jobTimedOut" : "fileDamaged");
  }
  if (ret !== 0 || data.length === 0) throw new LegacyError("fileDamaged");
  if (duration === null) {
    const reached = lastTime(log.join("\n"));
    if (reached !== null && reached > max) throw new LegacyError(kind === "video" ? "legacyVideoTooLong" : "legacyAudioTooLong");
  }
  onProgress(1);
  return { data, duration };
}

/** The last `time=` FFmpeg printed while converting, in seconds. */
function lastTime(text: string): number | null {
  const all = [...text.matchAll(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)];
  const m = all.at(-1);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}
