import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { decodeForWhisper, probeForTranscription } from "./audio";

// PCM WAV decodes without WebCodecs, so mediabunny's path runs in Node; ffmpeg makes the inputs.
const wav = (args: string[]) => new Blob([execFileSync("ffmpeg", ["-v", "error", ...args, "-f", "wav", "-"], { maxBuffer: 1 << 26 })]);

describe("audio for Whisper", () => {
  it("resamples and downmixes to 16 kHz mono, keeping the level", async () => {
    // 2 s of a 440 Hz tone at 48 kHz stereo, amplitude 0.5 (ffmpeg's sine is 1/8, ×4; RMS ≈ 0.354).
    const file = wav(["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2", "-af", "volume=4,pan=stereo|c0=c0|c1=c0", "-c:a", "pcm_s16le"]);
    const progress: number[] = [];
    const { samples, duration } = await decodeForWhisper(file, { onProgress: (p) => progress.push(p) });
    expect(Math.abs(samples.length - 32_000)).toBeLessThan(160);
    expect(duration).toBeCloseTo(2, 1);
    let energy = 0;
    for (let i = 1600; i < samples.length - 1600; i++) energy += samples[i]! ** 2;
    expect(Math.sqrt(energy / (samples.length - 3200))).toBeCloseTo(Math.SQRT1_2 / 2, 1);
    expect(progress.at(-1)).toBe(1);
  });

  it("refuses more than 30 minutes before decoding", async () => {
    const file = wav(["-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono", "-t", "1860", "-c:a", "pcm_u8"]);
    await expect(probeForTranscription(file)).rejects.toThrow("transcribeTooLong");
    await expect(decodeForWhisper(file)).rejects.toThrow("transcribeTooLong");
  });
});
