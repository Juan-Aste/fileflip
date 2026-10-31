// The FFmpeg WASM fallback, run in Node with the same @ffmpeg/core build the site serves.
// Inputs are generated here with the system's ffmpeg (or by hand: AMR); outputs are
// checked with the system's ffprobe, an independent reader.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { LEGACY_MAX_AUDIO_SECONDS, legacyArgs, looksLegacy, parseAudioShape, parseDuration } from "./options";
import { runLegacy, type FFmpegCore } from "./run";

const hasFfmpeg = (() => {
  try {
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const dir = mkdtempSync(join(tmpdir(), "legacy-"));

async function loadCore(): Promise<FFmpegCore> {
  // The core is built for workers: it reads `self.location`.
  Object.assign(globalThis, { self: globalThis, location: { href: "file:///core/" } });
  const root = join(process.cwd(), "node_modules/@ffmpeg/core/dist/esm");
  const { default: create } = (await import(/* @vite-ignore */ join(root, "ffmpeg-core.js"))) as { default: (o: object) => Promise<FFmpegCore> };
  return create({ wasmBinary: readFileSync(join(root, "ffmpeg-core.wasm")) });
}

function generate(name: string, args: string[]): Uint8Array {
  const file = join(dir, name);
  execFileSync("ffmpeg", ["-v", "error", "-y", ...args, file]);
  return readFileSync(file);
}
const testVideo = (seconds = 2) => ["-f", "lavfi", "-i", `testsrc=size=320x240:rate=25:duration=${seconds}`, "-f", "lavfi", "-i", `sine=frequency=440:duration=${seconds}`];

function probe(data: Uint8Array, name: string) {
  const file = join(dir, name);
  writeFileSync(file, data);
  return JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" })) as {
    streams: { codec_type: string; codec_name: string; width?: number; height?: number; sample_rate?: string; channels?: number }[];
    format: { format_name: string; duration: string };
  };
}

/** An AMR-NB file built by hand (no AMR encoder is needed): 12.2 kbit/s frames with arbitrary bits decode to sound. */
function amrFile(frames: number): Uint8Array {
  const out = new Uint8Array(6 + frames * 32);
  out.set(new TextEncoder().encode("#!AMR\n"));
  let seed = 7;
  for (let f = 0; f < frames; f++) {
    const at = 6 + f * 32;
    out[at] = (7 << 3) | 0x04; // mode 7 (12.2 kbit/s), good frame
    for (let i = 1; i < 32; i++) out[at + i] = seed = (seed * 1103515245 + 12345) & 0xff;
  }
  return out;
}

describe("legacy media options", () => {
  it("parses durations and audio shapes from FFmpeg's log", () => {
    expect(parseDuration("  Duration: 00:01:02.50, start: 0")).toBe(62.5);
    expect(parseDuration("  Duration: N/A, bitrate: N/A")).toBeNull();
    expect(parseAudioShape("  Stream #0:1: Audio: wmav2 (a[1][0][0] / 0x0161), 44100 Hz, stereo, fltp, 128 kb/s")).toEqual({ sampleRate: 44100, channels: 2 });
    expect(parseAudioShape("  Stream #0:0: Audio: ac3, 48000 Hz, 5.1(side), fltp, 448 kb/s")).toEqual({ sampleRate: 48000, channels: 6 });
    expect(parseAudioShape("  Stream #0:0: Audio: amr_nb (samr / 0x726D6173), 8000 Hz, mono, flt")).toEqual({ sampleRate: 8000, channels: 1 });
  });

  it("keeps the audio at most stereo and 48 kHz, never upsampling", () => {
    const args = legacyArgs("audio", "in", "out.wav", { audio: { sampleRate: 8000, channels: 1 } });
    expect(args.join(" ")).toContain("-ac 1 -c:a pcm_s16le -ar 8000");
    expect(legacyArgs("audio", "in", "out.wav", { audio: { sampleRate: 96000, channels: 6 } }).join(" ")).toContain("-ac 2 -c:a pcm_s16le -ar 48000");
  });

  it("only uses royalty-free encoders", () => {
    const all = [...legacyArgs("video", "in", "out.webm"), ...legacyArgs("audio", "in", "out.wav")].join(" ");
    expect(all).not.toMatch(/libx26|aac|mp3/);
    expect(all).toMatch(/libvpx/);
  });

  it("recognizes the old containers by their first bytes", () => {
    const bytes = (...parts: (string | number[])[]) => {
      const out: number[] = [];
      for (const p of parts) out.push(...(typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p));
      return new Uint8Array([...out, ...new Array(200).fill(0)]);
    };
    expect(looksLegacy(bytes("RIFF", [0, 0, 0, 0], "AVI "))).toBe(true);
    expect(looksLegacy(bytes([0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11]))).toBe(true);
    expect(looksLegacy(bytes("FLV", [1]))).toBe(true);
    expect(looksLegacy(bytes([0, 0, 1, 0xba]))).toBe(true);
    expect(looksLegacy(bytes(".RMF"))).toBe(true);
    expect(looksLegacy(bytes("#!AMR\n"))).toBe(true);
    expect(looksLegacy(bytes([0x0b, 0x77]))).toBe(true);
    expect(looksLegacy(bytes([0, 0, 0, 0x14], "ftyp3gp4"))).toBe(true);
    expect(looksLegacy(bytes([0, 0, 0, 0x18], "ftypisom"))).toBe(false);
    expect(looksLegacy(bytes("RIFF", [0, 0, 0, 0], "WAVE"))).toBe(false);
    expect(looksLegacy(bytes([0x1a, 0x45, 0xdf, 0xa3]))).toBe(false);
  });
});

describe.skipIf(!hasFfmpeg)("FFmpeg WASM fallback (real core)", () => {
  let core: FFmpegCore;
  beforeAll(async () => {
    core = await loadCore();
  }, 60_000);

  const run = (name: string, data: Uint8Array, kind: "video" | "audio") => {
    core.FS.writeFile(`/${name}`, data);
    try {
      const progress: number[] = [];
      const result = runLegacy(core, `/${name}`, kind, (p) => progress.push(p));
      return { ...result, progress };
    } finally {
      core.FS.unlink(`/${name}`);
    }
  };

  const videos: [string, string[]][] = [
    ["avi (MPEG-4 Part 2 + MP3)", ["-c:v", "mpeg4", "-c:a", "libmp3lame", "-f", "avi"]],
    ["wmv (WMV2 + WMA2)", ["-c:v", "wmv2", "-c:a", "wmav2", "-f", "asf"]],
    ["flv (Sorenson Spark + MP3)", ["-c:v", "flv", "-c:a", "libmp3lame", "-ar", "44100", "-f", "flv"]],
    ["mpg (MPEG-1 + MP2)", ["-c:v", "mpeg1video", "-c:a", "mp2", "-f", "mpeg"]],
    ["vob (MPEG-2 + AC-3)", ["-c:v", "mpeg2video", "-c:a", "ac3", "-f", "vob"]],
    ["3gp (H.263 + AAC)", ["-c:v", "h263", "-s", "352x288", "-c:a", "aac", "-ar", "8000", "-ac", "1", "-f", "3gp"]],
    ["rm (RealVideo 1 + AC-3)", ["-c:v", "rv10", "-c:a", "ac3", "-f", "rm"]],
  ];
  it.each(videos)("%s → WebM with VP8 and Opus", (label, args) => {
    const name = label.split(" ")[0]!;
    const input = generate(`in.${name}`, [...testVideo(), ...args]);
    expect(looksLegacy(input.subarray(0, 512))).toBe(true);
    const { data, duration, progress } = run(`in.${name}`, input, "video");
    expect(duration).toBeGreaterThan(1.5);
    const info = probe(data, `out-${name}.webm`);
    expect(info.format.format_name).toContain("webm");
    const video = info.streams.find((s) => s.codec_type === "video")!;
    expect(video.codec_name).toBe("vp8");
    expect(video.width! % 2).toBe(0);
    expect(info.streams.find((s) => s.codec_type === "audio")?.codec_name).toBe("opus");
    expect(Number(info.format.duration)).toBeGreaterThan(1.5);
    expect(progress.at(-1)).toBe(1);
  }, 60_000);

  const audios: [string, string, string[]][] = [
    ["wma", "wma", ["-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-c:a", "wmav2", "-f", "asf"]],
    ["ac3", "ac3", ["-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-ac", "6", "-c:a", "ac3", "-f", "ac3"]],
    ["mp2", "mp2", ["-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-c:a", "mp2", "-f", "mp2"]],
    ["avi (audio of a video)", "avi", [...testVideo(), "-c:v", "mpeg4", "-c:a", "libmp3lame", "-f", "avi"]],
  ];
  it.each(audios)("%s → WAV (at most stereo)", (_label, ext, args) => {
    const input = generate(`in-a.${ext}`, args);
    const { data } = run(`in-a.${ext}`, input, "audio");
    const info = probe(data, `out-${ext}.wav`);
    const audio = info.streams[0]!;
    expect(audio.codec_name).toBe("pcm_s16le");
    expect(audio.channels).toBeLessThanOrEqual(2);
    expect(Number(info.format.duration)).toBeGreaterThan(1.5);
  }, 60_000);

  it("AMR-NB (built by hand) → WAV at 8 kHz mono", () => {
    const { data, duration } = run("in.amr", amrFile(150), "audio");
    const info = probe(data, "out-amr.wav");
    expect(info.streams[0]).toMatchObject({ codec_name: "pcm_s16le", sample_rate: "8000", channels: 1 });
    expect(Number(info.format.duration)).toBeCloseTo(3, 1);
    expect(duration === null || Math.abs(duration - 3) < 0.2).toBe(true);
  }, 60_000);

  it("rejects files that are not media, audio-only files as video, and over-long audio", () => {
    expect(() => run("junk.avi", new TextEncoder().encode("RIFF....AVI not really a video"), "video")).toThrow(/unsupportedFormat|fileDamaged/);
    const wma = generate("only-audio.wma", ["-f", "lavfi", "-i", "sine=duration=1", "-c:a", "wmav2", "-f", "asf"]);
    expect(() => run("only-audio.wma", wma, "video")).toThrow("noVideoTrack");
    // 20 ms per AMR frame: a few seconds over the limit.
    expect(() => run("long.amr", amrFile((LEGACY_MAX_AUDIO_SECONDS + 5) * 50), "audio")).toThrow("legacyAudioTooLong");
  }, 120_000);

  it("rejects a truncated file", () => {
    const input = generate("cut.avi", [...testVideo(), "-c:v", "mpeg4", "-c:a", "libmp3lame", "-f", "avi"]);
    expect(() => run("cut.avi", input.subarray(0, 300), "video")).toThrow(/fileDamaged|unsupportedFormat|noVideoTrack/);
  }, 60_000);
});
