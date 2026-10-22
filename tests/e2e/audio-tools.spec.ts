// Audio converter: outputs are checked with the system's ffprobe/ffmpeg
// (independent of mediabunny and of the browser): container, codec, sample
// rate, channels, duration, and that each channel still carries its tone
// (left 440 Hz, right 660 Hz, measured by zero crossings).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, fileOf, openWithFiles, runTool, test, unzipEntries } from "./support";

const hasFfmpeg = (() => {
  try {
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

interface Probe {
  format: string;
  codec: string;
  sampleRate: number;
  channels: number;
  duration: number;
  bitrate: number;
  /** Tone of each channel in Hz. */
  tones: number[];
}

function probe(buf: Buffer, name: string): Probe {
  const file = join(mkdtempSync(join(tmpdir(), "audio-")), name);
  writeFileSync(file, buf);
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }));
  const stream = info.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "s16le", "-ac", "2", "-ar", "44100", "-"], { maxBuffer: 64 * 1024 * 1024 });
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  const frames = samples.length / 2;
  // Skip the encoders' start-up and tail; count sign changes in the middle second.
  const from = Math.floor(frames * 0.25);
  const to = Math.floor(frames * 0.75);
  const tones = [0, 1].map((ch) => {
    let crossings = 0;
    for (let i = from + 1; i < to; i++) if (samples[i * 2 + ch]! >= 0 !== samples[(i - 1) * 2 + ch]! >= 0) crossings++;
    return Math.round(crossings / 2 / ((to - from) / 44100));
  });
  return {
    format: info.format.format_name,
    codec: stream.codec_name,
    sampleRate: Number(stream.sample_rate),
    channels: stream.channels,
    duration: Number(info.format.duration),
    bitrate: Number(info.format.bit_rate),
    tones,
  };
}

const expectTones = (p: Probe) => {
  expect(Math.abs(p.tones[0]! - 440), `left ${p.tones[0]} Hz`).toBeLessThan(15);
  expect(Math.abs(p.tones[1]! - 660), `right ${p.tones[1]} Hz`).toBeLessThan(15);
};

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "the audio converter must not call the server").toEqual([]);
});

test.describe("tool: audio-converter", () => {
  test.skip(!hasFfmpeg, "needs ffmpeg/ffprobe to check the output");

  test("WAV, FLAC, OGG Vorbis, Opus, WebM and MP3 → MP3 at 192 kbps, both channels intact", async ({ page }) => {
    const inputs = ["audio.wav", "audio.flac", "audio.ogg", "audio.opus", "audio.webm", "audio.mp3"];
    await openWithFiles(page, "/es/convertir-audio", inputs);
    await page.getByRole("button", { name: "Convertir audio", exact: true }).click();
    await expect(page.locator("main li a[download]")).toHaveCount(6, { timeout: 60_000 });
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Descargar todo/ }).click()]);
    const entries = unzipEntries(readFileSync((await download.path())!));
    expect(entries.map((e) => e.name).sort()).toEqual(["audio (1).mp3", "audio (2).mp3", "audio (3).mp3", "audio (4).mp3", "audio (5).mp3", "audio.mp3"]);
    for (const entry of entries) {
      const p = probe(entry.data, entry.name);
      expect(p, entry.name).toMatchObject({ format: "mp3", codec: "mp3", sampleRate: 44100, channels: 2 });
      expect(Math.abs(p.duration - 2), `${entry.name} lasts ${p.duration} s`).toBeLessThan(0.15);
      expect(Math.abs(p.bitrate - 192_000), `${entry.name} at ${p.bitrate} bps`).toBeLessThan(20_000);
      expectTones(p);
    }
  });

  test("MP3 → WAV, FLAC, OGG (Opus) and M4A (AAC)", async ({ page }) => {
    await openWithFiles(page, "/en/audio-converter", ["audio.mp3"]);
    const expected = [
      { label: "WAV (lossless)", ext: "wav", format: "wav", codec: "pcm_s16le", sampleRate: 22050 },
      { label: "FLAC (lossless)", ext: "flac", format: "flac", codec: "flac", sampleRate: 22050 },
      { label: "OGG (Opus)", ext: "ogg", format: "ogg", codec: "opus", sampleRate: 48000 },
      { label: "M4A (AAC)", ext: "m4a", format: "mov,mp4,m4a,3gp,3g2,mj2", codec: "aac", sampleRate: 22050 },
    ];
    for (const { label, ext, format, codec, sampleRate } of expected) {
      await page.getByText(label, { exact: true }).click();
      const out = fileOf(await runTool(page, "Convert audio"));
      expect(out.name).toBe(`audio.${ext}`);
      const p = probe(out.buf, out.name);
      expect(p, label).toMatchObject({ format, codec, sampleRate, channels: 2 });
      expect(Math.abs(p.duration - 2), `${label} lasts ${p.duration} s`).toBeLessThan(0.15);
      expectTones(p);
      await page.getByRole("button", { name: "Start over" }).click();
      await page.locator('input[type="file"]').first().setInputFiles(join(__dirname, "../fixtures/audio.mp3"));
    }
  });

  test("AIFF, 24-bit AIFF and AIFF-C (sowt) → MP3; MP3 → AIFF", async ({ page }) => {
    await openWithFiles(page, "/en/audio-converter", ["audio.aiff", "audio-24.aif", "audio.aifc"]);
    await page.getByRole("button", { name: "Convert audio", exact: true }).click();
    await expect(page.locator("main li a[download]")).toHaveCount(3, { timeout: 60_000 });
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Download all/ }).click()]);
    const entries = unzipEntries(readFileSync((await download.path())!));
    expect(entries.map((e) => e.name).sort()).toEqual(["audio (1).mp3", "audio-24.mp3", "audio.mp3"]);
    for (const entry of entries) {
      const p = probe(entry.data, entry.name);
      expect(p, entry.name).toMatchObject({ format: "mp3", codec: "mp3", sampleRate: 44100, channels: 2 });
      // audio-24.aif lasts 1 s, the others 2 s.
      const seconds = entry.name === "audio-24.mp3" ? 1 : 2;
      expect(Math.abs(p.duration - seconds), `${entry.name} lasts ${p.duration} s`).toBeLessThan(0.15);
      expectTones(p);
    }

    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(join(__dirname, "../fixtures/audio.mp3"));
    await page.getByText("AIFF (lossless)", { exact: true }).click();
    const out = fileOf(await runTool(page, "Convert audio"));
    expect(out.name).toBe("audio.aiff");
    expect(out.buf.subarray(0, 4).toString("latin1") + out.buf.subarray(8, 12).toString("latin1")).toBe("FORMAIFF");
    const p = probe(out.buf, out.name);
    expect(p).toMatchObject({ format: "aiff", codec: "pcm_s16be", sampleRate: 22050, channels: 2 });
    expect(Math.abs(p.duration - 2), `lasts ${p.duration} s`).toBeLessThan(0.15);
    expectTones(p);
  });

  test("a cut AIFF and a compressed (μ-law) AIFF-C fail with clear messages", async ({ page }) => {
    await openWithFiles(page, "/en/audio-converter", ["corrupt/audio-truncated.aiff", "corrupt/audio-ulaw.aifc", "audio.aiff"]);
    await page.getByRole("button", { name: "Convert audio", exact: true }).click();
    await expect(page.locator("main li a[download]")).toHaveCount(1, { timeout: 60_000 });
    const main = page.locator("main");
    await expect(main).toContainText("damaged or incomplete");
    await expect(main).toContainText("can't be converted this way");
    await expect(page.locator("main li a[download]")).toHaveAttribute("download", "audio.mp3");
  });

  test("damaged, fake and (in this Chromium) undecodable AAC files fail with clear messages", async ({ page }) => {
    await openWithFiles(page, "/en/audio-converter", ["corrupt/audio-truncated.m4a", "corrupt/not-audio.mp3", "audio.m4a", "audio.wav"]);
    // Playwright's Chromium is built without proprietary codecs: no AAC decoder.
    const aac = await page.evaluate(async () => (await AudioDecoder.isConfigSupported({ codec: "mp4a.40.2", sampleRate: 44100, numberOfChannels: 2 })).supported);
    if (!aac) await expect(page.getByRole("status").filter({ hasText: "can't read AAC" })).toBeVisible();
    await page.getByRole("button", { name: "Convert audio", exact: true }).click();
    await expect(page.locator("main li a[download]")).toHaveCount(aac ? 2 : 1, { timeout: 60_000 });
    const main = page.locator("main");
    await expect(main).toContainText("format");
    if (!aac) await expect(main).toContainText("can't read the audio in this file");
    const link = page.locator("main li a[download]").last();
    await expect(link).toHaveAttribute("download", "audio.mp3");
  });
});
