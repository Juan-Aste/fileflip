// Video converter and "Extract audio": outputs are checked with the system's ffprobe/ffmpeg
// (independent of mediabunny and of the browser): container, codecs, size,
// duration, the picture (red in the first second, blue in the second) and the
// sound (left 440 Hz, right 660 Hz, measured by zero crossings).
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

interface VideoProbe {
  format: string;
  video: string;
  audio?: string;
  width: number;
  height: number;
  /** Size as shown, after the rotation metadata. */
  display: string;
  size: number;
  duration: number;
  /** Average color at 0.5 s and at 1.5 s. */
  colors: [number, number, number][];
  /** Tone of each channel in Hz. */
  tones: number[];
}

function probe(buf: Buffer, name: string): VideoProbe {
  const file = join(mkdtempSync(join(tmpdir(), "video-")), name);
  writeFileSync(file, buf);
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }));
  const v = info.streams.find((s: { codec_type: string }) => s.codec_type === "video");
  const a = info.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
  const colors = (v ? [0.5, 1.5] : []).map((at) => {
    const rgb = execFileSync("ffmpeg", ["-v", "error", "-ss", String(at), "-i", file, "-frames:v", "1", "-vf", "scale=1:1:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
    return [rgb[0]!, rgb[1]!, rgb[2]!] as [number, number, number];
  });
  let tones: number[] = [];
  if (a) {
    const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-vn", "-f", "s16le", "-ac", "2", "-ar", "44100", "-"], { maxBuffer: 64 * 1024 * 1024 });
    const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
    const frames = samples.length / 2;
    const from = Math.floor(frames * 0.25);
    const to = Math.floor(frames * 0.75);
    tones = [0, 1].map((ch) => {
      let crossings = 0;
      for (let i = from + 1; i < to; i++) if (samples[i * 2 + ch]! >= 0 !== samples[(i - 1) * 2 + ch]! >= 0) crossings++;
      return Math.round(crossings / 2 / ((to - from) / 44100));
    });
  }
  const rotation = Math.abs(Number(v?.side_data_list?.find((d: { rotation?: number }) => d.rotation !== undefined)?.rotation ?? 0)) % 180;
  const display = v ? (rotation === 90 ? `${v.height}x${v.width}` : `${v.width}x${v.height}`) : "";
  return { format: info.format.format_name, video: v?.codec_name, audio: a?.codec_name, width: v?.width, height: v?.height, display, size: buf.length, duration: Number(info.format.duration), colors, tones };
}

/** 2 s, `size` as shown, red then blue, both tones. */
function expectSameContent(p: VideoProbe, label: string, size = "320x240") {
  expect(p.display, label).toBe(size);
  expect(Math.abs(p.duration - 2), `${label} lasts ${p.duration} s`).toBeLessThan(0.15);
  const [first, second] = p.colors;
  expect(first![0] > 180 && first![2] < 80, `${label} red at 0.5 s: ${first}`).toBe(true);
  expect(second![2] > 180 && second![0] < 80, `${label} blue at 1.5 s: ${second}`).toBe(true);
  expect(Math.abs(p.tones[0]! - 440), `${label} left ${p.tones[0]} Hz`).toBeLessThan(15);
  expect(Math.abs(p.tones[1]! - 660), `${label} right ${p.tones[1]} Hz`).toBeLessThan(15);
}

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "the video converter must not call the server").toEqual([]);
});

test.describe("tool: video-converter", () => {
  test.skip(!hasFfmpeg, "needs ffmpeg/ffprobe to check the output");

  test("WebM (VP9/Opus) and MKV (VP8/Vorbis) → MP4: re-encoded, picture and sound intact", async ({ page }) => {
    await openWithFiles(page, "/es/convertir-video", ["video.webm", "video.mkv"]);
    // Playwright's Chromium has no H.264 encoder: the page says MP4 falls back to VP9/AV1.
    const h264 = await page.evaluate(async () => (await VideoEncoder.isConfigSupported({ codec: "avc1.42001f", width: 1280, height: 720, bitrate: 2_000_000 })).supported);
    if (!h264) await expect(page.getByRole("status").filter({ hasText: "no puede crear video H.264" })).toBeVisible();
    await page.getByRole("button", { name: "Convertir video", exact: true }).click();
    await expect(page.locator("main li a[download]")).toHaveCount(2, { timeout: 60_000 });
    await expect(page.locator("main").getByText(h264 ? "Video recodificado en H.264." : "Video recodificado en VP9.", { exact: true })).toHaveCount(2);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Descargar todo/ }).click()]);
    const entries = unzipEntries(readFileSync((await download.path())!));
    expect(entries.map((e) => e.name).sort()).toEqual(["video (1).mp4", "video.mp4"]);
    for (const entry of entries) {
      const p = probe(entry.data, entry.name);
      expect(p.format, entry.name).toContain("mp4");
      expect(["h264", "vp9", "av1"], entry.name).toContain(p.video);
      expect(p.audio, entry.name).toMatch(/^(aac|opus)$/);
      expectSameContent(p, entry.name);
    }
  });

  test("MP4 (H.264/AAC) → MOV and MKV copy the streams; MKV (VP8/Vorbis) → WebM too", async ({ page }) => {
    await openWithFiles(page, "/en/video-converter", ["video.mp4"]);
    const cases = [
      { file: "video.mp4", label: "MOV", ext: "mov", format: "mov", video: "h264", audio: "aac", codec: "H.264" },
      { file: "video.mp4", label: "MKV", ext: "mkv", format: "matroska", video: "h264", audio: "aac", codec: "H.264" },
      { file: "video.mkv", label: "WebM", ext: "webm", format: "webm", video: "vp8", audio: "vorbis", codec: "VP8" },
    ];
    for (const [i, c] of cases.entries()) {
      if (i > 0) {
        await page.getByRole("button", { name: "Start over" }).click();
        await page.locator('input[type="file"]').first().setInputFiles(join(__dirname, "../fixtures", c.file));
      }
      await page.getByText(c.label, { exact: true }).click();
      const out = fileOf(await runTool(page, "Convert video"));
      expect(out.name).toBe(`video.${c.ext}`);
      await expect(page.locator("main")).toContainText(`Video copied without re-encoding (${c.codec}).`);
      const p = probe(out.buf, out.name);
      expect(p.format, c.label).toContain(c.format);
      expect(p, c.label).toMatchObject({ video: c.video, audio: c.audio });
      expectSameContent(p, c.label);
    }
  });

  test("damaged, fake and audio-only files fail with clear messages; H.264 → WebM needs a decoder", async ({ page }) => {
    await openWithFiles(page, "/en/video-converter", ["corrupt/video-truncated.mp4", "corrupt/not-video.mp4", "audio.webm", "video.mp4", "video.mkv"]);
    const h264 = await page.evaluate(async () => (await VideoDecoder.isConfigSupported({ codec: "avc1.64000d", codedWidth: 320, codedHeight: 240 })).supported);
    await page.getByText("WebM", { exact: true }).click();
    await page.getByRole("button", { name: "Convert video", exact: true }).click();
    // video.mkv always converts; video.mp4 only where H.264 can be decoded.
    await expect(page.locator("main li a[download]")).toHaveCount(h264 ? 2 : 1, { timeout: 60_000 });
    const main = page.locator("main");
    await expect(main).toContainText("damaged or incomplete");
    await expect(main).toContainText("can't be converted this way");
    await expect(main).toContainText("This file has no video.");
    if (!h264) await expect(main).toContainText("can't read the video in this file");
    await expect(page.locator("main li a[download]").last()).toHaveAttribute("download", /video.*\.webm/);
  });

  test("WebM → MOV re-encodes to H.264, or says MOV needs it where the browser has no H.264 encoder", async ({ page }) => {
    await openWithFiles(page, "/en/video-converter", ["video.webm"]);
    const h264 = await page.evaluate(async () => (await VideoEncoder.isConfigSupported({ codec: "avc1.42001f", width: 1280, height: 720, bitrate: 2_000_000 })).supported);
    await page.getByText("MOV", { exact: true }).click();
    const result = await runTool(page, "Convert video");
    if (h264) {
      const p = probe(fileOf(result).buf, "video.mov");
      expect(p).toMatchObject({ video: "h264", audio: "aac" });
      expectSameContent(p, "MOV");
    } else {
      expect(result.error).toContain("MOV needs H.264");
    }
  });
});

test.describe("tool: extract-audio", () => {
  test.skip(!hasFfmpeg, "needs ffmpeg/ffprobe to check the output");

  const expectAudioOnly = (p: VideoProbe, label: string) => {
    expect(p.video, `${label} has no picture`).toBeUndefined();
    expect(Math.abs(p.duration - 2), `${label} lasts ${p.duration} s`).toBeLessThan(0.15);
    expect(Math.abs(p.tones[0]! - 440), `${label} left ${p.tones[0]} Hz`).toBeLessThan(15);
    expect(Math.abs(p.tones[1]! - 660), `${label} right ${p.tones[1]} Hz`).toBeLessThan(15);
  };

  test("“Original” copies AAC, Opus and Vorbis tracks as they are (no decoder needed)", async ({ page }) => {
    await openWithFiles(page, "/es/extraer-audio-de-video", ["video.mp4", "video.mov", "video.webm", "video.mkv"]);
    await page.getByRole("button", { name: "Extraer audio", exact: true }).click();
    await expect(page.locator("main li a[download]")).toHaveCount(4, { timeout: 60_000 });
    for (const codec of ["AAC", "Opus", "Vorbis"]) await expect(page.locator("main").getByText(`Audio copiado sin recomprimir (${codec}).`).first()).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Descargar todo/ }).click()]);
    const entries = unzipEntries(readFileSync((await download.path())!));
    expect(entries.map((e) => e.name).sort()).toEqual(["video (1).m4a", "video (1).ogg", "video.m4a", "video.ogg"]);
    const codecs = entries.map((entry) => {
      const p = probe(entry.data, entry.name);
      expect(p.format, entry.name).toMatch(entry.name.endsWith(".m4a") ? /mp4/ : /ogg/);
      expectAudioOnly(p, entry.name);
      return p.audio;
    });
    expect(codecs.sort()).toEqual(["aac", "aac", "opus", "vorbis"]);
  });

  test("a chosen format converts: WebM and MKV → MP3 at 192 kbps; MKV → WAV", async ({ page }) => {
    await openWithFiles(page, "/en/extract-audio-from-video", ["video.webm", "video.mkv"]);
    await page.getByText("MP3", { exact: true }).click();
    await page.getByRole("button", { name: "Extract audio", exact: true }).click();
    await expect(page.locator("main li a[download]")).toHaveCount(2, { timeout: 60_000 });
    await expect(page.locator("main").getByText("Audio converted to MP3.", { exact: true })).toHaveCount(2);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Download all/ }).click()]);
    for (const entry of unzipEntries(readFileSync((await download.path())!))) {
      const p = probe(entry.data, entry.name);
      expect(p, entry.name).toMatchObject({ format: "mp3", audio: "mp3" });
      expectAudioOnly(p, entry.name);
    }

    await page.getByRole("button", { name: "Start over" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(join(__dirname, "../fixtures/video.mkv"));
    await page.getByText("WAV (lossless)", { exact: true }).click();
    const out = fileOf(await runTool(page, "Extract audio"));
    expect(out.name).toBe("video.wav");
    const p = probe(out.buf, out.name);
    expect(p).toMatchObject({ format: "wav", audio: "pcm_s16le" });
    expectAudioOnly(p, "WAV");
  });

  test("a video without sound, a cut MP4 and a fake file fail with clear messages", async ({ page }) => {
    await openWithFiles(page, "/en/extract-audio-from-video", ["video-no-audio.webm", "corrupt/video-truncated.mp4", "corrupt/not-video.mp4", "video.webm"]);
    await page.getByRole("button", { name: "Extract audio", exact: true }).click();
    await expect(page.locator("main li a[download]")).toHaveCount(1, { timeout: 60_000 });
    const main = page.locator("main");
    await expect(main).toContainText("This file has no audio track.");
    await expect(main).toContainText("damaged or incomplete");
    await expect(main).toContainText("can't be converted this way");
    await expect(page.locator("main li a[download]")).toHaveAttribute("download", "video.ogg");
  });
});

test.describe("tool: compress-video", () => {
  test.skip(!hasFfmpeg, "needs ffmpeg/ffprobe to check the output");

  test("640×480 → 360p at low quality: smaller, picture and sound intact", async ({ page }) => {
    await openWithFiles(page, "/es/comprimir-video", ["video-640.webm"]);
    await page.getByText("Baja (más liviano)", { exact: true }).click();
    await page.getByText("360p", { exact: true }).click();
    const out = fileOf(await runTool(page, "Comprimir video"));
    expect(out.name).toBe("video-640.mp4");
    await expect(page.locator("main")).toContainText("480 × 360 px.");
    await expect(page.locator("main")).toContainText("menos");
    const p = probe(out.buf, out.name);
    expect(p.format).toContain("mp4");
    expect(["h264", "vp9", "av1"]).toContain(p.video);
    // Opus isn't copied into MP4 (Apple doesn't play it there): it becomes AAC.
    expect(p.audio).toBe("aac");
    expect(p.size, `${p.size} bytes`).toBeLessThan(readFileSync(join(__dirname, "../fixtures/video-640.webm")).length * 0.6);
    expectSameContent(p, "360p", "480x360");
  });

  test("a rotated phone video stays upright; WebM output; a small video is never enlarged", async ({ page }) => {
    await openWithFiles(page, "/en/compress-video", ["video-rotated.mp4", "video.webm"]);
    await page.getByText("High", { exact: true }).click();
    await page.getByText("1080p", { exact: true }).click();
    await page.getByText("WebM", { exact: true }).click();
    await page.getByRole("button", { name: "Compress video", exact: true }).click();
    await expect(page.locator("main li a[download]")).toHaveCount(2, { timeout: 60_000 });
    await expect(page.locator("main")).toContainText("240 × 320 px.");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Download all/ }).click()]);
    const entries = unzipEntries(readFileSync((await download.path())!));
    expect(entries.map((e) => e.name).sort()).toEqual(["video-rotated.webm", "video.webm"]);
    for (const entry of entries) {
      const p = probe(entry.data, entry.name);
      expect(p.format, entry.name).toContain("webm");
      expectSameContent(p, entry.name, entry.name === "video-rotated.webm" ? "240x320" : "320x240");
    }
  });
});

