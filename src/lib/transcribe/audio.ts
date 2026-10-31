// Audio for Whisper: any audio or video file the browser can decode, as 16 kHz
// mono 32-bit float samples. mediabunny demuxes, WebCodecs decodes and
// mediabunny resamples and downmixes; the samples go to a NullTarget-backed
// Conversion's `process` hook (nothing is encoded or kept but our copy).
// Runs on the page (WebCodecs' AudioDecoder is not in every browser's workers).
import { Conversion, NullTarget, Output, WavOutputFormat, type AudioSample } from "mediabunny";
import { openAudio, planarData } from "@/lib/audio/convert";
import { ConversionError } from "@/lib/convert-error";
import { MAX_TRANSCRIBE_SECONDS } from "./model";
import { SAMPLE_RATE } from "./whisper";

export interface DecodedAudio {
  samples: Float32Array<ArrayBuffer>;
  /** Seconds. */
  duration: number;
}

/** Duration of an audio or video file's sound, with the transcription limit checked. */
export async function probeForTranscription(file: Blob): Promise<number> {
  const { input, duration } = await openAudio(file);
  input.dispose();
  if (duration > MAX_TRANSCRIBE_SECONDS) throw new ConversionError("transcribeTooLong");
  return duration;
}

/** Decodes `file` to 16 kHz mono float samples, with progress 0–1. */
export async function decodeForWhisper(
  file: Blob,
  { signal, onProgress }: { signal?: AbortSignal; onProgress?: (progress: number) => void } = {},
): Promise<DecodedAudio> {
  const { input, duration } = await openAudio(file, { signal });
  try {
    if (duration > MAX_TRANSCRIBE_SECONDS) throw new ConversionError("transcribeTooLong");
    // One buffer of the expected length (plus a second of slack for rounding), grown if a file lies.
    let samples = new Float32Array(Math.ceil((duration + 1) * SAMPLE_RATE));
    let length = 0;
    const conversion = await Conversion.init({
      input,
      output: new Output({ format: new WavOutputFormat(), target: new NullTarget() }),
      video: { discard: true },
      audio: {
        codec: "pcm-s16",
        numberOfChannels: 1,
        sampleRate: SAMPLE_RATE,
        forceTranscode: true,
        process: (sample: AudioSample) => {
          const data = planarData(sample);
          if (length + data.length > samples.length) {
            if (length + data.length > (MAX_TRANSCRIBE_SECONDS + 1) * SAMPLE_RATE) throw new ConversionError("transcribeTooLong");
            const grown = new Float32Array(Math.max(samples.length * 2, length + data.length));
            grown.set(samples.subarray(0, length));
            samples = grown;
          }
          samples.set(data, length);
          length += data.length;
          return sample;
        },
      },
      showWarnings: false,
    });
    if (!conversion.isValid) throw new ConversionError("audioCodecUnsupported");
    conversion.onProgress = (p) => onProgress?.(p);
    const abort = () => void conversion.cancel();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      await conversion.execute();
    } catch (error) {
      if (signal?.aborted) throw new ConversionError("jobCancelled");
      throw error instanceof ConversionError ? error : new ConversionError("fileDamaged");
    } finally {
      signal?.removeEventListener("abort", abort);
    }
    if (length === 0) throw new ConversionError("fileDamaged");
    onProgress?.(1);
    return { samples: samples.slice(0, length), duration: length / SAMPLE_RATE };
  } finally {
    input.dispose();
  }
}
