// MP3 of the AI voice, written sentence by sentence while they are generated
// (nothing but the encoded file is kept): mediabunny with its LAME extension,
// mono at the model's 44.1 kHz. Imported lazily by the tool.
import { AudioSample, AudioSampleSource, BufferTarget, Mp3OutputFormat, Output } from "mediabunny";
import { ConversionError } from "@/lib/convert-error";
import { ensureEncoder } from "@/lib/audio/convert";

/** Speech needs little: 64 kbit/s mono is clear and ~0.5 MB per minute. */
export const MP3_BITRATE = 64_000;
/** Pause between sentences, as the reference SDK does. */
export const SENTENCE_GAP_SECONDS = 0.3;

export interface Mp3Writer {
  /** Appends one sentence (mono float PCM), with the pause before it when it is not the first. */
  add(pcm: Float32Array): Promise<void>;
  /** Seconds written so far. */
  seconds(): number;
  finish(): Promise<Uint8Array>;
}

export async function createMp3Writer(sampleRate: number): Promise<Mp3Writer> {
  await ensureEncoder("mp3");
  const output = new Output({ format: new Mp3OutputFormat(), target: new BufferTarget() });
  const source = new AudioSampleSource({ codec: "mp3", bitrate: MP3_BITRATE });
  output.addAudioTrack(source);
  await output.start();
  let frames = 0;
  const write = async (data: Float32Array) => {
    const sample = new AudioSample({ data, format: "f32-planar", numberOfChannels: 1, sampleRate, timestamp: frames / sampleRate });
    frames += data.length;
    try {
      await source.add(sample);
    } finally {
      sample.close();
    }
  };
  return {
    async add(pcm) {
      if (frames > 0) await write(new Float32Array(Math.round(SENTENCE_GAP_SECONDS * sampleRate)));
      await write(pcm);
    },
    seconds: () => frames / sampleRate,
    async finish() {
      source.close();
      await output.finalize();
      const buffer = (output.target as BufferTarget).buffer;
      if (!buffer || buffer.byteLength === 0 || frames === 0) throw new ConversionError("conversionFailed");
      return new Uint8Array(buffer);
    },
  };
}

/** A file name from the document title, else the first words of the text. */
export function mp3FileName(text: string, title?: string): string {
  const base = (title?.trim() || text.trim().split(/\s+/).slice(0, 6).join(" "))
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .replace(/[.\s]+$/, "");
  return `${base || "audio"}.mp3`;
}
