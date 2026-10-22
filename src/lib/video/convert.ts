// Video conversion on the page with mediabunny (MPL-2.0): demuxing and muxing
// in JS, decoding and encoding with the browser's WebCodecs (AAC audio with
// the WASM encoder of mediabunny's extension when the browser has none).
// Tracks whose codec the target container takes are copied without
// re-encoding. Imported lazily by the tool.
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  MkvOutputFormat,
  MovOutputFormat,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  Quality,
  WebMOutputFormat,
  AudioSample,
  type VideoSample,
  canEncodeVideo,
  type VideoCodec,
} from "mediabunny";
import { ConversionError } from "@/lib/convert-error";
import { assertComplete, ensureEncoder, planarData } from "@/lib/audio/convert";
import { validRange, type TrimRange } from "@/lib/audio/time";
import { encodersFor, MAX_VIDEO_SECONDS, scaledSize, SPEED_AUDIO_RATE, speedFrameRate, videoPlan, type VideoQuality, type VideoSpeed, type VideoTarget } from "./options";

const outputFormat: Record<VideoTarget, () => Mp4OutputFormat | MovOutputFormat | WebMOutputFormat | MkvOutputFormat> = {
  mp4: () => new Mp4OutputFormat({ fastStart: "in-memory" }),
  mov: () => new MovOutputFormat({ fastStart: "in-memory" }),
  webm: () => new WebMOutputFormat(),
  mkv: () => new MkvOutputFormat(),
};

/** Edits made while converting; any of them but a fast trim re-encodes the picture. */
export interface VideoEdit {
  /** "Compress video": encoding quality ("high" when re-encoding for another reason). */
  quality?: VideoQuality;
  /** Shorter side in pixels (720 for 720p); never enlarged. */
  maxShortSide?: number;
  /** Seconds of the input to keep. */
  trim?: TrimRange;
  /** Cut at the exact frame (re-encodes) instead of at the key frame before the start (copies). */
  exact?: boolean;
  /** "Change video speed": playback factor (re-encodes both tracks; the sound's pitch changes with it). */
  speed?: VideoSpeed;
  /** With a speed: drop the sound instead. */
  removeAudio?: boolean;
}

/** Duration in seconds of a video, with the same checks as a conversion. */
export async function probeVideo(file: Blob): Promise<{ duration: number }> {
  const { input, duration } = await openVideo(file);
  input.dispose();
  return { duration };
}

export interface VideoResult {
  data: Uint8Array;
  /** Seconds of the input (of the selection, when trimmed). */
  duration: number;
  /** Output video codec, and whether the video was copied without re-encoding. */
  videoCodec: VideoCodec;
  copied: boolean;
  /** Output display size. */
  width: number;
  height: number;
}

/** Opens a file for mediabunny, checking it holds video this browser can read; the caller disposes it. */
export async function openVideo(file: Blob) {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    try {
      await input.getFormat();
    } catch {
      throw new ConversionError("unsupportedFormat");
    }
    const [video, audio] = await Promise.all([input.getPrimaryVideoTrack(), input.getPrimaryAudioTrack()]).catch(() => {
      throw new ConversionError("fileDamaged");
    });
    if (!video) throw new ConversionError("noVideoTrack");
    const duration = await input.computeDuration().catch(() => {
      throw new ConversionError("fileDamaged");
    });
    if (duration > MAX_VIDEO_SECONDS) throw new ConversionError("videoTooLong");
    await assertComplete(video, duration);
    return { input, video, audio, duration };
  } catch (error) {
    input.dispose();
    throw error;
  }
}

/** Which of the target's video encoders this browser has (checked once per codec). */
const encodable = new Map<VideoCodec, boolean>();
async function encodableVideo(target: VideoTarget, width: number, height: number) {
  for (const codec of encodersFor(target)) {
    if (!encodable.has(codec)) encodable.set(codec, await canEncodeVideo(codec, { width, height }).catch(() => false));
  }
  return (codec: VideoCodec) => encodable.get(codec) === true;
}

export async function convertVideo(
  file: Blob,
  target: VideoTarget,
  { signal, onProgress, edit }: { signal?: AbortSignal; onProgress?: (progress: number) => void; edit?: VideoEdit } = {},
): Promise<VideoResult> {
  const { input, video, audio, duration } = await openVideo(file);
  try {
    const { width, height } = scaledSize(video.displayWidth, video.displayHeight, edit?.maxShortSide);
    const speed = edit?.speed;
    const reencode = edit !== undefined && (edit.quality !== undefined || edit.maxShortSide !== undefined || (edit.trim !== undefined && !!edit.exact) || speed !== undefined);
    const keepAudio = audio && !(speed && edit?.removeAudio) ? audio : null;
    if (edit?.trim && !validRange(edit.trim, duration)) throw new ConversionError("videoRangeInvalid");
    const trim = edit?.trim && { start: edit.trim.start, end: Math.min(edit.trim.end, duration) };
    const plan = videoPlan(target, { video: video.codec, audio: keepAudio?.codec ?? null }, await encodableVideo(target, width, height), reencode, speed !== undefined);
    if (!plan) throw new ConversionError("videoEncoderUnsupported");
    // Re-encoding needs the browser to decode the source first (H.264 and HEVC aren't
    // decodable in every browser; AAC neither).
    if (!plan.copyVideo && !(await video.canDecode())) throw new ConversionError("videoCodecUnsupported");
    if (keepAudio && plan.audio) {
      if (!plan.copyAudio && !(await keepAudio.canDecode())) throw new ConversionError("audioCodecUnsupported");
      // Even a copied track may be re-encoded when its packets can't be copied as they are, so the
      // encoder is loaded when there is one (Vorbis has none: it can only be copied).
      await ensureEncoder(plan.audio).catch((error: unknown) => {
        if (!plan.copyAudio) throw error;
      });
    }

    // A different speed scales every timestamp. The video is first thinned to a frame rate that stays
    // reasonable once sped up; the sound is resampled to SPEED_AUDIO_RATE / speed and then labelled
    // SPEED_AUDIO_RATE, so it plays `speed` times faster (and higher), like a tape.
    const frameRate = speed && speed > 1 ? speedFrameRate((await video.computePacketStats(100)).averagePacketRate, speed) : undefined;
    const speedVideo = speed && {
      ...(frameRate ? { frameRate } : {}),
      process: (sample: VideoSample) => {
        sample.setTimestamp(sample.timestamp / speed);
        sample.setDuration(sample.duration / speed);
        return sample;
      },
    };
    const speedAudio = speed && {
      sampleRate: Math.round(SPEED_AUDIO_RATE / speed),
      processedSampleRate: SPEED_AUDIO_RATE,
      process: (sample: AudioSample) => relabel(sample, SPEED_AUDIO_RATE, sample.timestamp / speed),
    };

    const output = new Output({ format: outputFormat[target](), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      // The same codec as the source copies the packets; any other is encoded (high quality unless chosen).
      video: {
        codec: plan.video,
        ...(plan.copyVideo ? {} : { quality: new Quality(edit?.quality ?? "high") }),
        ...(width !== video.displayWidth || height !== video.displayHeight ? { width, height, fit: "fill" as const } : {}),
        ...speedVideo,
      },
      audio: plan.audio ? { codec: plan.audio, ...(plan.copyAudio ? {} : { quality: QUALITY_HIGH }), ...speedAudio } : { discard: true },
      // AAC starts with encoder priming before 0 s, which MKV/WebM can't hold: shifting the whole
      // file by that much (mediabunny keeps the tracks in sync) lets the packets be copied.
      // A fast trim copies from the key frame before the start (it may begin a little earlier).
      copy: { shiftTolerance: 0.5 },
      ...(trim ? { trim } : {}),
      showWarnings: false,
    });
    // A conversion that would silently drop the picture or the sound is an error instead.
    for (const dropped of conversion.discardedTracks) {
      if (dropped.track === video) throw new ConversionError(dropped.reason === "no_encodable_target_codec" ? "videoEncoderUnsupported" : "videoCodecUnsupported");
      if (dropped.track === keepAudio && plan.audio) throw new ConversionError("audioCodecUnsupported");
    }
    if (!conversion.isValid) throw new ConversionError("videoCodecUnsupported");
    conversion.onProgress = (progress) => onProgress?.(progress);
    const abort = () => void conversion.cancel();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      if (signal?.aborted) throw new ConversionError("jobCancelled");
      await conversion.execute();
    } catch (error) {
      if (signal?.aborted) throw new ConversionError("jobCancelled");
      throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
    } finally {
      signal?.removeEventListener("abort", abort);
    }
    const buffer = (output.target as BufferTarget).buffer;
    if (!buffer || buffer.byteLength === 0) throw new ConversionError("conversionFailed");
    return { data: new Uint8Array(buffer), duration: (trim ? trim.end - trim.start : duration) / (speed ?? 1), videoCodec: plan.video, copied: plan.copyVideo, width, height };
  } finally {
    input.dispose();
  }
}

/** The same frames as `sample` (copied), presented at another sample rate and timestamp. */
function relabel(sample: AudioSample, sampleRate: number, timestamp: number): AudioSample {
  return new AudioSample({ data: planarData(sample), format: "f32-planar", numberOfChannels: sample.numberOfChannels, sampleRate, timestamp });
}
