import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConversionError } from "@/lib/convert-error";
import { aiffToWav, isAiff, readExtended, wavToAiff, writeExtended } from "./aiff";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const codeOf = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return error instanceof ConversionError ? error.code : String(error);
  }
  return "no error";
};

/** Left/right 16-bit samples of a little-endian PCM WAV (44-byte header, as aiffToWav writes it). */
const wavSamples = (wav: Uint8Array) => new Int16Array(wav.slice(44).buffer);

describe("80-bit extended float", () => {
  it("round-trips the usual sample rates", () => {
    const buf = new Uint8Array(10);
    for (const rate of [8000, 11025, 22050, 44100, 48000, 88200, 96000, 192000, 1, 0.5]) {
      writeExtended(rate, buf, 0);
      expect(readExtended(buf, 0)).toBe(rate);
    }
  });

  it("writes 44100 Hz as every AIFF file does", () => {
    const buf = new Uint8Array(10);
    writeExtended(44100, buf, 0);
    expect([...buf]).toEqual([0x40, 0x0e, 0xac, 0x44, 0, 0, 0, 0, 0, 0]);
  });
});

describe("aiffToWav", () => {
  const wav = fixture("audio.wav");
  // The ffmpeg fixtures carry the same signal: compare against the WAV's samples.
  const reference = new Int16Array(wav.slice(wav.length - 2 * 22050 * 2 * 2).buffer);

  it("reads 16-bit AIFF and little-endian AIFF-C (sowt) into the same samples as the WAV", () => {
    for (const name of ["audio.aiff", "audio.aifc"]) {
      const bytes = fixture(name);
      expect(isAiff(bytes)).toBe(true);
      const { wav: out, info } = aiffToWav(bytes);
      expect(info, name).toEqual({ channels: 2, sampleRate: 22050, bitsPerSample: 16, frames: 44100 });
      expect(wavSamples(out)).toEqual(reference);
    }
  });

  it("keeps 24-bit samples (little-endian in the WAV)", () => {
    const { wav: out, info } = aiffToWav(fixture("audio-24.aif"));
    expect(info).toEqual({ channels: 2, sampleRate: 22050, bitsPerSample: 24, frames: 22050 });
    expect(new DataView(out.buffer).getUint16(34, true)).toBe(24);
    // The top 16 bits of each 24-bit sample match the 16-bit reference (within rounding).
    for (let i = 0; i < 2000; i++) {
      const s24 = (out[44 + i * 3]! | (out[45 + i * 3]! << 8) | (out[46 + i * 3]! << 16)) << 8 >> 8;
      expect(Math.abs(s24 / 256 - reference[i]!)).toBeLessThanOrEqual(1);
    }
  });

  it("widens signed 8-bit AIFF to 16-bit", () => {
    const aiff = wavToAiff(wav);
    // Hand-build an 8-bit mono file: COMM bits = 8, two samples -128 and 127.
    const bytes = new Uint8Array(54 + 2);
    bytes.set(aiff.subarray(0, 54));
    const view = new DataView(bytes.buffer);
    view.setUint32(4, bytes.length - 8);
    view.setUint16(20, 1);
    view.setUint32(22, 2);
    view.setUint16(26, 8);
    view.setUint32(42, 8 + 2);
    bytes[54] = 0x80;
    bytes[55] = 0x7f;
    expect([...wavSamples(aiffToWav(bytes).wav)]).toEqual([-32768, 32512]);
  });

  it("refuses damaged, compressed and non-AIFF files", () => {
    expect(codeOf(() => aiffToWav(fixture("corrupt/audio-truncated.aiff")))).toBe("fileDamaged");
    expect(codeOf(() => aiffToWav(fixture("corrupt/audio-ulaw.aifc")))).toBe("unsupportedFormat");
    expect(codeOf(() => aiffToWav(fixture("audio.wav")))).toBe("unsupportedFormat");
    expect(codeOf(() => aiffToWav(fixture("audio.aiff").slice(0, 30)))).toBe("fileDamaged");
    // A chunk size pointing far past the end must not loop or read out of bounds.
    const huge = fixture("audio.aiff");
    new DataView(huge.buffer).setUint32(16, 0xfffffff0);
    expect(codeOf(() => aiffToWav(huge))).toBe("fileDamaged");
  });
});

describe("wavToAiff", () => {
  it("round-trips the WAV fixture byte for byte through AIFF", () => {
    const wav = fixture("audio.wav");
    const aiff = wavToAiff(wav);
    expect(isAiff(aiff)).toBe(true);
    expect(aiff.length % 2).toBe(0);
    expect(new DataView(aiff.buffer).getUint32(4)).toBe(aiff.length - 8);
    const back = aiffToWav(aiff).wav;
    expect(wavSamples(back)).toEqual(new Int16Array(wav.slice(wav.length - 44100 * 4).buffer));
  });

  it("refuses anything but PCM WAV", () => {
    expect(codeOf(() => wavToAiff(fixture("audio.aiff")))).toBe("conversionFailed");
  });
});
