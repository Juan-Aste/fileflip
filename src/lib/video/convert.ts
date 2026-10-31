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
  AudioSampleSource,
  NullTarget,
  VideoSample,
  VideoSampleSink,
  VideoSampleSource,
  WavOutputFormat,
  canEncodeVideo,
  type VideoCodec,
} from "mediabunny";
import { ConversionError, InputFileError } from "@/lib/convert-error";
import { isLegacyFile, legacyFallback, splitProgress, type LegacyHooks } from "@/lib/legacy-media/fallback";
import { assertComplete, ensureEncoder, planarData } from "@/lib/audio/convert";
import { validRange, type TrimRange } from "@/lib/audio/time";
import { encodersFor, JOIN_AUDIO_RATE, MAX_JOIN_SHORT_SIDE, MAX_VIDEO_SECONDS, scaledSize, SPEED_AUDIO_RATE, speedFrameRate, videoPlan, type VideoQuality, type VideoSpeed, type VideoTarget } from "./options";

const outputFormat: Record<VideoTarget, () => Mp4OutputFormat | MovOutputFormat | WebMOutputFormat | MkvOutputFormat> = {
  mp4: () => new Mp4OutputFormat({ fastStart: "in-memory" }),
  mov: () => new MovOutputFormat({ fastStart: "in-memory" }),
  webm: () => new WebMOutputFormat(),
  mkv: () => new MkvOutputFormat(),
};

/** Without WebCodecs no format can be encoded: say the browser can't, not that this format needs H.264. */
const noEncoderCode = () => (typeof VideoEncoder === "undefined" ? "browserUnsupported" : "videoEncoderUnsupported");

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
export async function probeVideo(file: Blob, hooks?: LegacyHooks): Promise<{ duration: number }> {
  const { input, duration } = await openVideo(file, hooks);
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

/**
 * Opens a file for mediabunny, checking it holds video this browser can read; the caller disposes it.
 * Old formats mediabunny can't read (AVI, WMV, FLV, MPG, VOB, 3GP, RM…) are first rewritten as
 * WebM by the FFmpeg WASM fallback (src/lib/legacy-media), which takes `hooks` (cancel, progress).
 */
export async function openVideo(file: Blob, hooks?: LegacyHooks) {
  try {
    return await openVideoDirect(file);
  } catch (error) {
    const rewritten = await legacyFallback(file, "video", error, hooks);
    if (!rewritten) throw error;
    return openVideoDirect(rewritten);
  }
}

async function openVideoDirect(file: Blob) {
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
    // A codec mediabunny doesn't know (H.263 or MPEG-4 Part 2 in 3GP, MPEG-2 in a transport stream, AMR sound…).
    if (video.codec === null || (audio && audio.codec === null && (await isLegacyFile(file)))) throw new ConversionError("videoCodecUnsupported");
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
  const progress = splitProgress(onProgress);
  const { input, video, audio, duration } = await openVideo(file, { signal, onProgress: progress.legacy });
  try {
    const { width, height } = scaledSize(video.displayWidth, video.displayHeight, edit?.maxShortSide);
    const speed = edit?.speed;
    const reencode = edit !== undefined && (edit.quality !== undefined || edit.maxShortSide !== undefined || (edit.trim !== undefined && !!edit.exact) || speed !== undefined);
    const keepAudio = audio && !(speed && edit?.removeAudio) ? audio : null;
    if (edit?.trim && !validRange(edit.trim, duration)) throw new ConversionError("videoRangeInvalid");
    const trim = edit?.trim && { start: edit.trim.start, end: Math.min(edit.trim.end, duration) };
    const plan = videoPlan(target, { video: video.codec, audio: keepAudio?.codec ?? null }, await encodableVideo(target, width, height), reencode, speed !== undefined);
    if (!plan) throw new ConversionError(noEncoderCode());
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
    conversion.onProgress = (p) => progress.rest(p);
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

export interface JoinedVideo {
  data: Uint8Array;
  duration: number;
  videoCodec: VideoCodec;
  width: number;
  height: number;
}

/**
 * Several videos, in order, → one MP4 or WebM. Every frame is decoded and drawn,
 * centred with black bands, on a canvas the size of the first video (its shorter
 * side at most MAX_JOIN_SHORT_SIDE), then encoded; the sound of each input is
 * decoded and resampled to 48 kHz stereo by its own Conversion (to a NullTarget,
 * like joinAudio) and forwarded to one encoder, with silence for inputs that
 * have none. The two tracks of each input are pumped together so they interleave.
 */
export async function joinVideos(
  files: readonly Blob[],
  target: "mp4" | "webm",
  { signal, onProgress }: { signal?: AbortSignal; onProgress?: (progress: number) => void } = {},
): Promise<JoinedVideo> {
  const opened: Awaited<ReturnType<typeof openVideo>>[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      try {
        const o = await openVideo(files[i]!);
        opened.push(o);
        if (!(await o.video.canDecode())) throw new ConversionError("videoCodecUnsupported");
        if (o.audio && !(await o.audio.canDecode())) throw new ConversionError("audioCodecUnsupported");
      } catch (error) {
        // Say which file failed: the batch has a single output.
        throw new InputFileError(error instanceof ConversionError ? error.code : "fileDamaged", i);
      }
    }
    const total = opened.reduce((sum, o) => sum + o.duration, 0);
    if (total > MAX_VIDEO_SECONDS) throw new ConversionError("videoTooLong");
    const first = opened[0]!.video;
    const { width, height } = scaledSize(first.displayWidth, first.displayHeight, MAX_JOIN_SHORT_SIDE);
    const codec = encodersFor(target).find(await encodableVideo(target, width, height));
    if (!codec) throw new ConversionError(noEncoderCode());
    const withSound = opened.some((o) => o.audio);
    const audioCodec = target === "mp4" ? "aac" : "opus";
    if (withSound) await ensureEncoder(audioCodec);

    const output = new Output({ format: outputFormat[target](), target: new BufferTarget() });
    const videoSource = new VideoSampleSource({ codec, quality: QUALITY_HIGH, sizeChangeBehavior: "contain" });
    output.addVideoTrack(videoSource);
    const audioSource = withSound ? new AudioSampleSource({ codec: audioCodec, quality: QUALITY_HIGH }) : null;
    if (audioSource) output.addAudioTrack(audioSource);
    await output.start();

    const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height) : Object.assign(document.createElement("canvas"), { width, height });
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
    if (!ctx) throw new ConversionError("browserUnsupported");

    const channels = 2;
    let written = 0; // audio frames sent to the encoder
    const addAudio = async (sample: AudioSample) => {
      try {
        await audioSource!.add(sample);
      } finally {
        sample.close();
      }
      written += sample.numberOfFrames;
    };
    /** Silence up to `seconds` of output audio. */
    const padTo = async (seconds: number) => {
      const frames = Math.round(seconds * JOIN_AUDIO_RATE) - written;
      if (frames <= 0) return;
      await addAudio(new AudioSample({ data: new Float32Array(frames * channels), format: "f32-planar", numberOfChannels: channels, sampleRate: JOIN_AUDIO_RATE, timestamp: written / JOIN_AUDIO_RATE }));
    };

    let offset = 0;
    for (let i = 0; i < opened.length; i++) {
      if (signal?.aborted) throw new ConversionError("jobCancelled");
      const { input, video, audio, duration } = opened[i]!;
      const start = Math.max(0, await video.getFirstTimestamp());
      const end = Math.round((offset + duration) * JOIN_AUDIO_RATE);
      const videoDone = { seconds: 0 };
      const report = () => onProgress?.(Math.min(1, (offset + videoDone.seconds) / Math.max(total, 0.001)));

      const pumpVideo = async () => {
        for await (const sample of new VideoSampleSink(video).samples()) {
          try {
            if (signal?.aborted) throw new ConversionError("jobCancelled");
            const t = Math.max(0, sample.timestamp - start);
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, width, height);
            sample.drawWithFit(ctx, { fit: "contain" });
            const frame = new VideoSample(canvas, { timestamp: offset + t, duration: sample.duration });
            try {
              await videoSource.add(frame);
            } finally {
              frame.close();
            }
            videoDone.seconds = t;
            report();
          } finally {
            sample.close();
          }
        }
      };

      const pumpAudio = async () => {
        if (!audioSource) return;
        await padTo(offset);
        if (!audio) return;
        // This Conversion decodes and resamples; its own WAV output goes to a NullTarget.
        const conversion = await Conversion.init({
          input,
          output: new Output({ format: new WavOutputFormat(), target: new NullTarget() }),
          video: { discard: true },
          audio: {
            codec: "pcm-s16",
            numberOfChannels: channels,
            sampleRate: JOIN_AUDIO_RATE,
            forceTranscode: true,
            process: async (sample: AudioSample) => {
              // Sound longer than the input's duration is cut so the next input stays in sync.
              const frames = Math.min(sample.numberOfFrames, end - written);
              if (frames > 0) {
                const data = planarData(sample);
                const kept = new Float32Array(frames * channels);
                for (let c = 0; c < channels; c++) kept.set(data.subarray(c * sample.numberOfFrames, c * sample.numberOfFrames + frames), c * frames);
                await addAudio(new AudioSample({ data: kept, format: "f32-planar", numberOfChannels: channels, sampleRate: JOIN_AUDIO_RATE, timestamp: written / JOIN_AUDIO_RATE }));
              }
              return sample;
            },
          },
          showWarnings: false,
        });
        if (!conversion.isValid) throw new InputFileError("audioCodecUnsupported", i);
        const abort = () => void conversion.cancel();
        signal?.addEventListener("abort", abort, { once: true });
        try {
          await conversion.execute();
        } finally {
          signal?.removeEventListener("abort", abort);
        }
      };

      try {
        await Promise.all([pumpVideo(), pumpAudio()]);
      } catch (error) {
        if (signal?.aborted) throw new ConversionError("jobCancelled");
        throw error instanceof ConversionError ? error : new InputFileError("fileDamaged", i);
      }
      offset += duration;
    }
    if (audioSource) {
      await padTo(offset);
      audioSource.close();
    }
    videoSource.close();
    await output.finalize();
    const buffer = (output.target as BufferTarget).buffer;
    if (!buffer || buffer.byteLength === 0) throw new ConversionError("conversionFailed");
    return { data: new Uint8Array(buffer), duration: offset, videoCodec: codec, width, height };
  } finally {
    for (const o of opened) o.input.dispose();
  }
}
