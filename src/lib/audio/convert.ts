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
  canEncodeAudio,
  type AudioCodec,
} from "mediabunny";
import { ConversionError } from "@/lib/convert-error";
import { aiffToWav, isAiff, wavToAiff } from "./aiff";
import { audioPlan, MAX_AUDIO_SECONDS, type AudioOptions } from "./options";

const encoderExtensions: Partial<Record<AudioCodec, () => Promise<void>>> = {
  mp3: () => import("@mediabunny/mp3-encoder").then((m) => m.registerMp3Encoder()),
  flac: () => import("@mediabunny/flac-encoder").then((m) => m.registerFlacEncoder()),
  aac: () => import("@mediabunny/aac-encoder").then((m) => m.registerAacEncoder()),
};
const registered = new Set<AudioCodec>();

/** Makes `codec` encodable: the browser's own encoder when it has one, else the WASM extension (once). */
async function ensureEncoder(codec: AudioCodec) {
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
}

export async function convertAudio(
  file: Blob,
  options: AudioOptions,
  { signal, onProgress }: { signal?: AbortSignal; onProgress?: (progress: number) => void } = {},
): Promise<AudioResult> {
  const plan = audioPlan(options);
  await ensureEncoder(plan.codec);
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

    const output = new Output({ format: outputFormat[options.target](), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input,
      output,
      video: { discard: true },
      audio: {
        codec: plan.codec,
        ...(plan.bitrate ? { bitrate: plan.bitrate } : {}),
        ...(plan.sampleRate ? { sampleRate: plan.sampleRate } : {}),
        ...(plan.sampleFormat ? { sampleFormat: plan.sampleFormat } : {}),
        // A lossy target is re-encoded even from the same codec, so the chosen quality applies.
        forceTranscode: plan.lossy,
      },
      showWarnings: false,
    });
    if (!conversion.isValid) throw new ConversionError("audioCodecUnsupported");
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
    const data = new Uint8Array(buffer);
    return { data: options.target === "aiff" ? wavToAiff(data) : data, duration };
  } finally {
    input.dispose();
  }
}
