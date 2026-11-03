import type { FormatId } from "@/config/formats";
import { audioTargets, type AudioTarget } from "@/lib/audio/options";
import { ConversionError } from "@/lib/convert-error";
import { LEGACY_AUDIO_EXTENSIONS } from "@/lib/legacy-media/options";

/** Extensions the audio tools accept (old formats go through the FFmpeg WASM fallback); the engine still checks the content. */
export const AUDIO_EXTENSIONS = ["mp3", "wav", "wave", "flac", "ogg", "oga", "opus", "m4a", "aac", "webm", "weba", "aiff", "aif", "aifc", ...LEGACY_AUDIO_EXTENSIONS];

/** Runs one file with the tool's time limit; cancelling or the limit stops the conversion. */
export async function withTimeLimit<T>(timeoutMs: number, signal: AbortSignal | undefined, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    return await run(controller.signal);
  } catch (error) {
    throw timedOut ? new ConversionError("jobTimedOut") : error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

/** Keeps the output in the input's format when the audio tools can write it, else MP3. */
export const sameTarget = (from: FormatId | null): AudioTarget => ((audioTargets as readonly string[]).includes(from ?? "") ? (from as AudioTarget) : "mp3");
