// Video converter: outputs are checked with the system's ffprobe/ffmpeg
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
  const colors = [0.5, 1.5].map((at) => {
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
  return { format: info.format.format_name, video: v?.codec_name, audio: a?.codec_name, width: v?.width, height: v?.height, duration: Number(info.format.duration), colors, tones };
}

/** 2 s, 320×240, red then blue, both tones. */
function expectSameContent(p: VideoProbe, label: string) {
  expect(p, label).toMatchObject({ width: 320, height: 240 });
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
