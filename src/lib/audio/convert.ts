// Audio conversion on the page with mediabunny (MPL-2.0): demuxing and muxing
// in JS, decoding with the browser's WebCodecs, encoding with WebCodecs (Opus)
// or the WASM encoders of mediabunny's extensions (MP3: LAME, FLAC: libFLAC,
// AAC: FFmpeg's encoder), each in its own worker. Imported lazily by the tool.
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  FlacOutputFormat,
  Input,
  Mp3OutputFormat,
  Mp4OutputFormat,
  OggOutputFormat,
  Output,
  WavOutputFormat,
  AudioSample,
  AudioSampleSink,
  AudioSampleSource,
  NullTarget,
  EncodedPacketSink,
  type InputTrack,
  type InputAudioTrack,
  canEncodeAudio,
  type AudioCodec,
} from "mediabunny";
import { ConversionError, InputFileError } from "@/lib/convert-error";
import { aiffToWav, isAiff, wavToAiff } from "./aiff";
import { audioPlan, MAX_AUDIO_SECONDS, type AudioOptions } from "./options";
import { createLevelMeter, normalizeGain, toDb, type NormalizeMode } from "./normalize";
import { fadeGain, fadeLengths, validRange, type TrimRange } from "./time";

const encoderExtensions: Partial<Record<AudioCodec, () => Promise<void>>> = {
  mp3: () => import("@mediabunny/mp3-encoder").then((m) => m.registerMp3Encoder()),
  flac: () => import("@mediabunny/flac-encoder").then((m) => m.registerFlacEncoder()),
  aac: () => import("@mediabunny/aac-encoder").then((m) => m.registerAacEncoder()),
};
const registered = new Set<AudioCodec>();

/** Makes `codec` encodable: the browser's own encoder when it has one, else the WASM extension (once). */
export async function ensureEncoder(codec: AudioCodec) {
  if (registered.has(codec) || (await canEncodeAudio(codec))) return;
  const register = encoderExtensions[codec];
  if (!register) throw new ConversionError("browserUnsupported");
  await register();
  registered.add(codec);
}

const outputFormat = {
  wav: () => new WavOutputFormat(),
  mp3: () => new Mp3OutputFormat(),
  flac: () => new FlacOutputFormat(),
  ogg: () => new OggOutputFormat(),
  m4a: () => new Mp4OutputFormat({ fastStart: "in-memory" }),
  aiff: () => new WavOutputFormat(),
} as const;

export interface AudioResult {
  data: Uint8Array;
  /** Seconds of the input. */
  duration: number;
  /** Gain applied by normalization, in dB. */
  gainDb?: number;
}

/** Edits applied while converting (the audio tools other than the plain converter). */
export interface AudioEdit {
  /** Seconds of the input to keep. */
  trim?: TrimRange;
  /** Linear fades, in seconds (each capped at half the result). */
  fadeIn?: number;
  fadeOut?: number;
  /** Output channels (downmix or upmix) and sample rate; Opus always runs at 48 kHz. */
  channels?: 1 | 2;
  sampleRate?: number;
  /** Measure the levels in a first pass and apply one gain (no clipping). */
  normalize?: NormalizeMode;
}

/**
 * A cut file may still list every packet in its index while the demuxer stops
 * quietly at the end of the data: without its last packet the output would be
 * silently incomplete, so that is reported as damage.
 */
export async function assertComplete(track: InputTrack, duration: number) {
  const last = await new EncodedPacketSink(track).getPacket(Infinity).catch(() => null);
  if (!last || duration <= 0) throw new ConversionError("fileDamaged");
}

/** Opens a file for mediabunny, checking it holds audio this browser can decode; the caller disposes it. */
async function openAudio(file: Blob) {
  // mediabunny has no AIFF demuxer: an AIFF input is rewritten as WAV first.
  const source = isAiff(new Uint8Array(await file.slice(0, 12).arrayBuffer()))
    ? new Blob([aiffToWav(new Uint8Array(await file.arrayBuffer())).wav as Uint8Array<ArrayBuffer>])
    : file;
  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
  try {
    try {
      await input.getFormat();
    } catch {
      throw new ConversionError("unsupportedFormat");
    }
    const track = await input.getPrimaryAudioTrack().catch(() => {
      throw new ConversionError("fileDamaged");
    });
    if (!track) throw new ConversionError("noAudioTrack");
    // AAC, for one, can't be decoded by browsers built without proprietary codecs.
    if (!(await track.canDecode())) throw new ConversionError("audioCodecUnsupported");
    const duration = await input.computeDuration([track]).catch(() => {
      throw new ConversionError("fileDamaged");
    });
    if (duration > MAX_AUDIO_SECONDS) throw new ConversionError("audioTooLong");
    await assertComplete(track, duration);
    return { input, track, duration };
  } catch (error) {
    input.dispose();
    throw error;
  }
}

/** Duration in seconds of an audio file, with the same checks as a conversion. */
export async function probeAudio(file: Blob): Promise<{ duration: number }> {
  const { input, duration } = await openAudio(file);
  input.dispose();
  return { duration };
}

/** Peak and RMS of the decoded track (the first pass of normalization), between `start` and `end` seconds. */
async function measureLevels(track: InputAudioTrack, signal: AbortSignal | undefined, onProgress: (p: number) => void, start?: number, end?: number) {
  const meter = createLevelMeter();
  const sink = new AudioSampleSink(track);
  const from = start ?? 0;
  const span = (end ?? (await track.computeDuration())) - from;
  for await (const sample of sink.samples(start, end)) {
    try {
      if (signal?.aborted) throw new ConversionError("jobCancelled");
      // Only the frames inside the range count (the first and last blocks stick out).
      const first = Math.max(0, Math.round((from - sample.timestamp) * sample.sampleRate));
      const last = end === undefined ? sample.numberOfFrames : Math.min(sample.numberOfFrames, Math.round((end - sample.timestamp) * sample.sampleRate));
      if (last > first) {
        const block = new Float32Array(last - first);
        for (let c = 0; c < sample.numberOfChannels; c++) {
          sample.copyTo(block, { planeIndex: c, format: "f32-planar", frameOffset: first, frameCount: last - first });
          meter.add(block);
        }
      }
      if (span > 0) onProgress(Math.min(1, (sample.timestamp + sample.duration - from) / span));
    } finally {
      sample.close();
    }
  }
  return meter.levels();
}

/** The samples of `sample` as 32-bit float, one channel after another (planar). */
export function planarData(sample: AudioSample): Float32Array<ArrayBuffer> {
  const frames = sample.numberOfFrames;
  const data = new Float32Array(frames * sample.numberOfChannels);
  for (let c = 0; c < sample.numberOfChannels; c++) sample.copyTo(data.subarray(c * frames, (c + 1) * frames), { planeIndex: c, format: "f32-planar" });
  return data;
}

const planarSample = (sample: AudioSample, data: Float32Array<ArrayBuffer>, timestamp: number) =>
  new AudioSample({ data, format: "f32-planar", numberOfChannels: sample.numberOfChannels, sampleRate: sample.sampleRate, timestamp });

/** A copy of `sample` in 32-bit float with each frame scaled by `gainAt(seconds from the start of the result)`. */
function applyGain(sample: AudioSample, gainAt: (t: number) => number): AudioSample {
  const frames = sample.numberOfFrames;
  const channels = sample.numberOfChannels;
  const data = planarData(sample);
  for (let i = 0; i < frames; i++) {
    const gain = gainAt(sample.timestamp + i / sample.sampleRate);
    if (gain === 1) continue;
    for (let c = 0; c < channels; c++) data[c * frames + i]! *= gain;
  }
  return planarSample(sample, data, sample.timestamp);
}

export async function convertAudio(
  file: Blob,
  options: AudioOptions,
  { signal, onProgress, edit = {} }: { signal?: AbortSignal; onProgress?: (progress: number) => void; edit?: AudioEdit } = {},
): Promise<AudioResult> {
  const plan = audioPlan(options);
  await ensureEncoder(plan.codec);
  const { input, track, duration } = await openAudio(file);
  try {
    if (edit.trim && !validRange(edit.trim, duration)) throw new ConversionError("audioRangeInvalid");
    const trim = edit.trim && { start: edit.trim.start, end: Math.min(edit.trim.end, duration) };
    const total = trim ? trim.end - trim.start : duration;
    const fades = fadeLengths(total, edit.fadeIn ?? 0, edit.fadeOut ?? 0);
    // Normalization measures first (40 % of the progress bar), then converts with one gain.
    let gain = 1;
    if (edit.normalize) {
      const levels = await measureLevels(track, signal, (p) => onProgress?.(p * 0.4), trim?.start, trim?.end).catch((error) => {
        throw signal?.aborted ? new ConversionError("jobCancelled") : error instanceof ConversionError ? error : new ConversionError("fileDamaged");
      });
      const found = normalizeGain(levels, edit.normalize);
      if (found === null) throw new ConversionError("audioSilent");
      gain = found;
    }
    const share = edit.normalize ? 0.6 : 1;
    const processing = fades.fadeIn > 0 || fades.fadeOut > 0 || gain !== 1;
    const sampleRate = plan.codec === "opus" ? plan.sampleRate : (edit.sampleRate ?? plan.sampleRate);

    const output = new Output({ format: outputFormat[options.target](), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input,
      output,
      video: { discard: true },
      audio: {
        codec: plan.codec,
        ...(plan.bitrate ? { bitrate: plan.bitrate } : {}),
        ...(sampleRate ? { sampleRate } : {}),
        ...(edit.channels ? { numberOfChannels: edit.channels } : {}),
        ...(plan.sampleFormat ? { sampleFormat: plan.sampleFormat } : {}),
        // A lossy target is re-encoded even from the same codec, so the chosen quality applies; a trim is
        // re-encoded too so it cuts at the exact frame instead of at packet boundaries.
        forceTranscode: plan.lossy || processing || !!trim || !!edit.channels || !!edit.sampleRate,
        // Samples arrive with timestamps from the start of the result (the trim offset is already applied).
        ...(processing ? { process: (sample: AudioSample) => applyGain(sample, (t) => gain * fadeGain(t, total, fades.fadeIn, fades.fadeOut)) } : {}),
      },
      ...(trim ? { trim } : {}),
      showWarnings: false,
    });
    if (!conversion.isValid) throw new ConversionError("audioCodecUnsupported");
    conversion.onProgress = (progress) => onProgress?.(1 - share + progress * share);
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
    const data = new Uint8Array(buffer);
    return { data: options.target === "aiff" ? wavToAiff(data) : data, duration, ...(edit.normalize ? { gainDb: toDb(gain) } : {}) };
  } finally {
    input.dispose();
  }
}

/**
 * Joins several audio files, in order, into one: every input is decoded and
 * resampled/remixed to common parameters (the highest sample rate and channel
 * count among them, at most stereo; MP3 and Opus keep their fixed rates) by its
 * own Conversion, whose samples are forwarded to one shared encoder.
 * `gapSeconds` of silence goes between inputs.
 */
export async function joinAudio(
  files: readonly Blob[],
  options: AudioOptions,
  { signal, onProgress, gapSeconds = 0 }: { signal?: AbortSignal; onProgress?: (progress: number) => void; gapSeconds?: number } = {},
): Promise<AudioResult> {
  const plan = audioPlan(options);
  await ensureEncoder(plan.codec);
  const opened: Awaited<ReturnType<typeof openAudio>>[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      try {
        opened.push(await openAudio(files[i]!));
      } catch (error) {
        // Say which file failed: the batch has a single output.
        throw new InputFileError(error instanceof ConversionError ? error.code : "fileDamaged", i);
      }
    }
    const total = opened.reduce((sum, o) => sum + o.duration, 0) + gapSeconds * (opened.length - 1);
    if (total > MAX_AUDIO_SECONDS) throw new ConversionError("audioTooLong");
    const channels = Math.min(2, Math.max(...opened.map((o) => o.track.numberOfChannels)));
    const sampleRate = plan.sampleRate ?? Math.max(...opened.map((o) => o.track.sampleRate));

    const output = new Output({ format: outputFormat[options.target](), target: new BufferTarget() });
    const source = new AudioSampleSource({
      codec: plan.codec,
      ...(plan.bitrate ? { bitrate: plan.bitrate } : {}),
      ...(plan.sampleFormat ? { transform: { sampleFormat: plan.sampleFormat } } : {}),
    });
    output.addAudioTrack(source);
    await output.start();

    let written = 0; // frames sent to the encoder
    let done = 0; // seconds of input finished
    const add = async (sample: AudioSample) => {
      const copy = planarSample(sample, planarData(sample), written / sampleRate);
      written += copy.numberOfFrames;
      try {
        await source.add(copy);
      } finally {
        copy.close();
      }
    };
    for (let i = 0; i < opened.length; i++) {
      if (signal?.aborted) throw new ConversionError("jobCancelled");
      if (i > 0 && gapSeconds > 0) {
        const frames = Math.round(gapSeconds * sampleRate);
        const silence = new AudioSample({ data: new Float32Array(frames * channels), format: "f32-planar", numberOfChannels: channels, sampleRate, timestamp: 0 });
        await add(silence);
        silence.close();
      }
      const { input, duration } = opened[i]!;
      // This Conversion decodes and resamples; its own WAV output goes to a NullTarget (mediabunny
      // won't finalize an empty one, so the samples pass through to it too: PCM, cheap, nothing kept).
      const conversion = await Conversion.init({
        input,
        output: new Output({ format: new WavOutputFormat(), target: new NullTarget() }),
        video: { discard: true },
        audio: {
          codec: "pcm-s16",
          numberOfChannels: channels,
          sampleRate,
          forceTranscode: true,
          process: async (sample: AudioSample) => {
            await add(sample);
            return sample;
          },
        },
        showWarnings: false,
      });
      if (!conversion.isValid) throw new InputFileError("audioCodecUnsupported", i);
      conversion.onProgress = (p) => onProgress?.(Math.min(1, (done + p * duration) / Math.max(total, 0.001)));
      const abort = () => void conversion.cancel();
      signal?.addEventListener("abort", abort, { once: true });
      try {
        await conversion.execute();
      } catch (error) {
        if (signal?.aborted) throw new ConversionError("jobCancelled");
        throw error instanceof ConversionError ? error : new InputFileError("fileDamaged", i);
      } finally {
        signal?.removeEventListener("abort", abort);
      }
      done += duration + gapSeconds;
    }
    source.close();
    await output.finalize();
    const buffer = (output.target as BufferTarget).buffer;
    if (!buffer || buffer.byteLength === 0) throw new ConversionError("conversionFailed");
    const data = new Uint8Array(buffer);
    return { data: options.target === "aiff" ? wavToAiff(data) : data, duration: written / sampleRate };
  } finally {
    for (const o of opened) o.input.dispose();
  }
}

/** Containers that hold each source codec as it is, for "Extract audio" without re-encoding. */
const copyContainers: Partial<Record<AudioCodec, { format: () => Mp4OutputFormat | Mp3OutputFormat | OggOutputFormat | FlacOutputFormat | WavOutputFormat; ext: string; mime: string }>> = {
  aac: { format: () => new Mp4OutputFormat({ fastStart: "in-memory" }), ext: "m4a", mime: "audio/mp4" },
  mp3: { format: () => new Mp3OutputFormat(), ext: "mp3", mime: "audio/mpeg" },
  opus: { format: () => new OggOutputFormat(), ext: "ogg", mime: "audio/ogg" },
  vorbis: { format: () => new OggOutputFormat(), ext: "ogg", mime: "audio/ogg" },
  flac: { format: () => new FlacOutputFormat(), ext: "flac", mime: "audio/flac" },
  "pcm-s16": { format: () => new WavOutputFormat(), ext: "wav", mime: "audio/wav" },
  "pcm-s24": { format: () => new WavOutputFormat(), ext: "wav", mime: "audio/wav" },
  "pcm-f32": { format: () => new WavOutputFormat(), ext: "wav", mime: "audio/wav" },
};

export interface CopiedAudio extends AudioResult {
  codec: AudioCodec;
  ext: string;
  mime: string;
}

/**
 * The audio track of a video (or any file) copied as it is into a container
 * of its own: no decoding, no quality loss. Null when its codec has no such
 * container or the packets can't be copied; the caller then converts it.
 */
export async function copyAudioTrack(file: Blob, { signal, onProgress }: { signal?: AbortSignal; onProgress?: (progress: number) => void } = {}): Promise<CopiedAudio | null> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    try {
      await input.getFormat();
    } catch {
      throw new ConversionError("unsupportedFormat");
    }
    const track = await input.getPrimaryAudioTrack().catch(() => {
      throw new ConversionError("fileDamaged");
    });
    if (!track) throw new ConversionError("noAudioTrack");
    const duration = await input.computeDuration([track]).catch(() => {
      throw new ConversionError("fileDamaged");
    });
    if (duration > MAX_AUDIO_SECONDS) throw new ConversionError("audioTooLong");
    await assertComplete(track, duration);
    const codec = track.codec;
    const container = codec && copyContainers[codec];
    if (!codec || !container) return null;
    const output = new Output({ format: container.format(), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      video: { discard: true },
      audio: { codec },
      // Only a copy is wanted here; AAC's encoder priming (before 0 s) is shifted, keeping sync.
      copy: { mode: "forced", shiftTolerance: 0.5 },
      showWarnings: false,
    });
    if (!conversion.isValid || conversion.discardedTracks.some((d) => d.track === track)) return null;
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
    return { data: new Uint8Array(buffer), duration, codec, ext: container.ext, mime: container.mime };
  } finally {
    input.dispose();
  }
}

