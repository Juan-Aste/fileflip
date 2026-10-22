// Video converter and "Extract audio": outputs are checked with the system's ffprobe/ffmpeg
// (independent of mediabunny and of the browser): container, codecs, size,
// duration, the picture (red in the first second, blue in the second) and the
// sound (left 440 Hz, right 660 Hz, measured by zero crossings).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
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
  /** Average color at the probed times (0.5 s and 1.5 s by default). */
  colors: [number, number, number][];
  /** Tone of each channel in Hz. */
  tones: number[];
}

function probe(buf: Buffer, name: string, at = [0.5, 1.5]): VideoProbe {
  const file = join(mkdtempSync(join(tmpdir(), "video-")), name);
  writeFileSync(file, buf);
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }));
  const v = info.streams.find((s: { codec_type: string }) => s.codec_type === "video");
  const a = info.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
  const colors = (v ? at : []).map((at) => {
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

test.describe("tool: trim-video", () => {
  test.skip(!hasFfmpeg, "needs ffmpeg/ffprobe to check the output");

  const times = (page: import("@playwright/test").Page) => ({
    start: page.getByRole("textbox", { name: "Start" }),
    end: page.getByRole("textbox", { name: "End" }),
  });
  const isRed = (c: number[]) => c[0]! > 180 && c[2]! < 80;
  const isBlue = (c: number[]) => c[2]! > 180 && c[0]! < 80;

  test("exact: WebM 0:00.5–0:01.5 → 1 s of WebM, half red and half blue, with sound", async ({ page }) => {
    await openWithFiles(page, "/en/trim-video", ["video.webm"]);
    const { start, end } = times(page);
    await expect(end).toHaveValue("0:02.0");
    await start.fill("0:00.5");
    await end.fill("0:01.5");
    const out = fileOf(await runTool(page, "Trim video"));
    expect(out.name).toBe("video.webm");
    await expect(page.locator("main")).toContainText("0:00.5");
    const p = probe(out.buf, out.name, [0.25, 0.75]);
    expect(p.format).toContain("webm");
    expect(Math.abs(p.duration - 1), `lasts ${p.duration} s`).toBeLessThan(0.1);
    expect(isRed(p.colors[0]!), `red at 0.25 s: ${p.colors[0]}`).toBe(true);
    expect(isBlue(p.colors[1]!), `blue at 0.75 s: ${p.colors[1]}`).toBe(true);
    expect(Math.abs(p.tones[0]! - 440)).toBeLessThan(15);
    expect(Math.abs(p.tones[1]! - 660)).toBeLessThan(15);
  });

  test("fast: MP4 (H.264, not decodable here) 0:01.0–0:02.0 is copied from its key frame", async ({ page }) => {
    await openWithFiles(page, "/es/recortar-video", ["video.mp4"]);
    await page.getByRole("textbox", { name: "Inicio" }).fill("0:01.0");
    await page.getByText("Rápido (sin recomprimir)", { exact: true }).click();
    const out = fileOf(await runTool(page, "Recortar video"));
    expect(out.name).toBe("video.mp4");
    const p = probe(out.buf, out.name, [0.2, 0.8]);
    expect(p).toMatchObject({ video: "h264", audio: "aac", display: "320x240" });
    // The fixture has a key frame every second, so the copy starts exactly at 1 s.
    expect(Math.abs(p.duration - 1), `lasts ${p.duration} s`).toBeLessThan(0.15);
    for (const c of p.colors) expect(isBlue(c), `blue: ${c}`).toBe(true);
  });

  test("invalid times disable the action; a fake file shows the error", async ({ page }) => {
    await openWithFiles(page, "/en/trim-video", ["video.webm"]);
    const { start, end } = times(page);
    await expect(end).toHaveValue("0:02.0");
    const action = page.getByRole("button", { name: "Trim video", exact: true });
    for (const [s, e] of [["0:01.5", "0:01.0"], ["0:00.0", "0:05.0"], ["1:75", "0:01.0"]]) {
      await start.fill(s!);
      await end.fill(e!);
      await expect(action).toBeDisabled();
    }
    await page.getByRole("button", { name: "Remove video.webm" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(join(__dirname, "../fixtures/corrupt/not-video.mp4"));
    await expect(page.locator("main")).toContainText("can't be converted this way");
  });
});


test.describe("tool: video-to-gif", () => {
  test.skip(!hasFfmpeg, "needs ffmpeg/ffprobe to check the output");

  test("WebM 0–2 s at 240 px and 10 fps → a looping GIF of 20 frames, red then blue", async ({ page }) => {
    await openWithFiles(page, "/en/video-to-gif", ["video.webm"]);
    await expect(page.getByRole("textbox", { name: "End" })).toHaveValue("0:02.0");
    await page.getByText("240 px", { exact: true }).click();
    const out = fileOf(await runTool(page, "Create GIF"));
    expect(out.name).toBe("video.gif");
    await expect(page.locator("main")).toContainText("20 frames of 240 × 180 px.");
    const meta = await sharp(out.buf, { animated: true }).metadata();
    expect(meta).toMatchObject({ format: "gif", width: 240, pages: 20, pageHeight: 180, loop: 0 });
    expect(meta.delay?.every((d) => d === 100)).toBe(true);
    expect(out.buf.includes(Buffer.from("NETSCAPE2.0"))).toBe(true);
    const p = probe(out.buf, out.name);
    expect(p.display).toBe("240x180");
    expect(Math.abs(p.duration - 2), `lasts ${p.duration} s`).toBeLessThan(0.15);
    const [first, second] = p.colors;
    expect(first![0] > 180 && first![2] < 80, `red at 0.5 s: ${first}`).toBe(true);
    expect(second![2] > 180 && second![0] < 80, `blue at 1.5 s: ${second}`).toBe(true);
  });

  test("a rotated phone video stays upright; no loop when unchecked; 5 fps", async ({ page }) => {
    await openWithFiles(page, "/es/video-a-gif", ["video-rotated.mp4"]);
    await expect(page.getByRole("textbox", { name: "Fin" })).toHaveValue("0:02.0");
    await page.getByText("5 por segundo", { exact: true }).click();
    await page.getByText("Repetir sin fin", { exact: true }).click();
    const out = fileOf(await runTool(page, "Crear GIF"));
    const meta = await sharp(out.buf, { animated: true }).metadata();
    expect(meta).toMatchObject({ format: "gif", width: 240, pageHeight: 320, pages: 10 });
    expect(out.buf.includes(Buffer.from("NETSCAPE2.0")), "no loop extension").toBe(false);
  });

  test("H.264 that this browser can't decode and a fake file show clear errors", async ({ page }) => {
    await openWithFiles(page, "/en/video-to-gif", ["video.mp4"]);
    const h264 = await page.evaluate(async () => (await VideoDecoder.isConfigSupported({ codec: "avc1.64000d", codedWidth: 320, codedHeight: 240 })).supported);
    const result = await runTool(page, "Create GIF");
    if (h264) expect(fileOf(result).name).toBe("video.gif");
    else expect(result.error).toContain("can't read the video in this file");
    // After an error the file stays selected; after a GIF the page offers to start over.
    await page.getByRole("button", { name: h264 ? "Start over" : "Remove video.mp4" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(join(__dirname, "../fixtures/corrupt/not-video.mp4"));
    await expect(page.locator("main")).toContainText("can't be converted this way");
  });
});

test.describe("tool: video-speed", () => {
  test.skip(!hasFfmpeg, "needs ffmpeg/ffprobe to check the output");

  const isRed = (c: number[]) => c[0]! > 180 && c[2]! < 80;
  const isBlue = (c: number[]) => c[2]! > 180 && c[0]! < 80;

  test("2×: WebM and MKV → 1 s each, red then blue, tones an octave higher", async ({ page }) => {
    await openWithFiles(page, "/en/change-video-speed", ["video.webm", "video.mkv"]);
    await expect(page.getByText("2×", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Change speed", exact: true }).click();
    await expect(page.locator("main").getByText("Speed 2×: lasts 0:01.0.")).toHaveCount(2, { timeout: 60_000 });
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Download all/ }).click()]);
    const entries = unzipEntries(readFileSync((await download.path())!));
    expect(entries.map((e) => e.name).sort()).toEqual(["video-2x.mkv", "video-2x.webm"]);
    for (const entry of entries) {
      const p = probe(entry.data, entry.name, [0.25, 0.75]);
      expect(p.display, entry.name).toBe("320x240");
      expect(Math.abs(p.duration - 1), `${entry.name} lasts ${p.duration} s`).toBeLessThan(0.1);
      expect(isRed(p.colors[0]!), `${entry.name} red at 0.25 s: ${p.colors[0]}`).toBe(true);
      expect(isBlue(p.colors[1]!), `${entry.name} blue at 0.75 s: ${p.colors[1]}`).toBe(true);
      expect(p.audio, entry.name).toBe("opus");
      expect(Math.abs(p.tones[0]! - 880), `${entry.name} left ${p.tones[0]} Hz`).toBeLessThan(25);
      expect(Math.abs(p.tones[1]! - 1320), `${entry.name} right ${p.tones[1]} Hz`).toBeLessThan(25);
    }
  });

  test("0.5× → 4 s with tones an octave lower; “remove sound” leaves only the picture", async ({ page }) => {
    await openWithFiles(page, "/es/cambiar-velocidad-video", ["video.webm"]);
    await page.getByText("0,5×", { exact: true }).click();
    let out = fileOf(await runTool(page, "Cambiar velocidad"));
    expect(out.name).toBe("video-0.5x.webm");
    await expect(page.locator("main")).toContainText("Velocidad 0,5×: dura 0:04.0.");
    let p = probe(out.buf, out.name, [1, 3]);
    expect(Math.abs(p.duration - 4), `lasts ${p.duration} s`).toBeLessThan(0.15);
    expect(isRed(p.colors[0]!) && isBlue(p.colors[1]!), `colors ${p.colors}`).toBe(true);
    expect(Math.abs(p.tones[0]! - 220), `left ${p.tones[0]} Hz`).toBeLessThan(10);
    expect(Math.abs(p.tones[1]! - 330), `right ${p.tones[1]} Hz`).toBeLessThan(10);

    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(join(__dirname, "../fixtures/video.webm"));
    await page.getByText("4×", { exact: true }).click();
    await page.getByText("Quitar sonido", { exact: true }).click();
    out = fileOf(await runTool(page, "Cambiar velocidad"));
    p = probe(out.buf, out.name, [0.1, 0.4]);
    expect(p.audio).toBeUndefined();
    expect(Math.abs(p.duration - 0.5), `lasts ${p.duration} s`).toBeLessThan(0.1);
    expect(isRed(p.colors[0]!) && isBlue(p.colors[1]!), `colors ${p.colors}`).toBe(true);
  });

  test("a 60 fps video at 2× is thinned to 60 fps instead of 120", async ({ page }) => {
    await openWithFiles(page, "/en/change-video-speed", ["video-60fps.webm"]);
    const out = fileOf(await runTool(page, "Change speed"));
    const p = probe(out.buf, out.name, [0.25, 0.75]);
    expect(Math.abs(p.duration - 1), `lasts ${p.duration} s`).toBeLessThan(0.1);
    expect(isRed(p.colors[0]!) && isBlue(p.colors[1]!), `colors ${p.colors}`).toBe(true);
    const file = join(mkdtempSync(join(tmpdir(), "video-")), out.name);
    writeFileSync(file, out.buf);
    const frames = Number(execFileSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", file], { encoding: "utf8" }).trim());
    expect(frames, `${frames} frames in 1 s`).toBeGreaterThan(50);
    expect(frames, `${frames} frames in 1 s`).toBeLessThanOrEqual(62);
  });

  test("a cut MP4 and a fake file fail with clear messages while the good one is processed", async ({ page }) => {
    await openWithFiles(page, "/en/change-video-speed", ["video.webm", "corrupt/video-truncated.mp4", "corrupt/not-video.mp4"]);
    await page.getByRole("button", { name: "Change speed", exact: true }).click();
    const main = page.locator("main");
    await expect(main.getByText("Speed 2×: lasts 0:01.0.")).toBeVisible({ timeout: 60_000 });
    await expect(main).toContainText("can't be converted this way");
    await expect(main).toContainText("damaged");
  });
});

test.describe("tool: join-videos", () => {
  test.skip(!hasFfmpeg, "needs ffmpeg/ffprobe to check the output");

  const isRed = (c: number[]) => c[0]! > 180 && c[2]! < 80;
  const isBlue = (c: number[]) => c[2]! > 180 && c[0]! < 80;
  const isBlack = (c: number[]) => c[0]! < 40 && c[1]! < 40 && c[2]! < 40;

  /** Color of pixel (x, y) of the frame at `at` seconds, and the RMS level of the sound between two times. */
  function pixel(file: string, at: number, x: number, y: number, width: number) {
    const rgb = execFileSync("ffmpeg", ["-v", "error", "-ss", String(at), "-i", file, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]);
    const i = (y * width + x) * 3;
    return [rgb[i]!, rgb[i + 1]!, rgb[i + 2]!];
  }
  function level(file: string, from: number, to: number) {
    const pcm = execFileSync("ffmpeg", ["-v", "error", "-ss", String(from), "-t", String(to - from), "-i", file, "-vn", "-f", "s16le", "-ac", "1", "-ar", "8000", "-"]);
    const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
    return Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / Math.max(1, samples.length));
  }
  const save = (buf: Buffer, name: string) => {
    const file = join(mkdtempSync(join(tmpdir(), "video-")), name);
    writeFileSync(file, buf);
    return file;
  };

  test("MKV and WebM, reordered, → one MP4 of 4 s: red, blue, red, blue, with sound throughout", async ({ page }) => {
    await openWithFiles(page, "/en/join-videos", ["video.webm", "video.mkv"]);
    await page.getByRole("button", { name: "Move video.mkv up" }).click();
    await expect(page.locator("main ul li").nth(0)).toContainText("video.mkv");
    const out = fileOf(await runTool(page, "Join videos"));
    expect(out.name).toBe("video-joined.mp4");
    await expect(page.locator("main")).toContainText("2 files joined: 0:04.0 in total. 320 × 240 px.");
    const p = probe(out.buf, out.name, [0.5, 1.5, 2.5, 3.5]);
    expect(p.format).toContain("mp4");
    expect(p).toMatchObject({ audio: "aac", display: "320x240" });
    expect(Math.abs(p.duration - 4), `lasts ${p.duration} s`).toBeLessThan(0.15);
    expect(p.colors.map((c) => (isRed(c) ? "red" : isBlue(c) ? "blue" : String(c)))).toEqual(["red", "blue", "red", "blue"]);
    expect(Math.abs(p.tones[0]! - 440), `left ${p.tones[0]} Hz`).toBeLessThan(15);
    expect(Math.abs(p.tones[1]! - 660), `right ${p.tones[1]} Hz`).toBeLessThan(15);
    const file = save(out.buf, out.name);
    for (const [from, to] of [[0.3, 1.7], [2.3, 3.7]] as const) expect(level(file, from, to), `sound at ${from} s`).toBeGreaterThan(1000);
  });

  test("a vertical video gets black bands and a clip without sound stays silent (WebM)", async ({ page }) => {
    await openWithFiles(page, "/es/unir-videos", ["video.webm", "video-rotated.mp4", "video-no-audio.webm"]);
    await page.getByText("WebM", { exact: true }).click();
    const out = fileOf(await runTool(page, "Unir videos"));
    expect(out.name).toBe("video-unido.webm");
    const p = probe(out.buf, out.name);
    expect(p.format).toContain("webm");
    expect(p).toMatchObject({ video: "vp9", audio: "opus", display: "320x240" });
    // 2 s + 2 s (rotated) + 1 s (no sound).
    expect(Math.abs(p.duration - 5), `lasts ${p.duration} s`).toBeLessThan(0.15);
    const file = save(out.buf, out.name);
    // The upright 240×320 clip is fitted into 320×240: 180 px wide in the middle, black bands on both sides.
    expect(isRed(pixel(file, 2.5, 160, 120, 320)), "red in the middle at 2.5 s").toBe(true);
    expect(isBlue(pixel(file, 3.5, 160, 120, 320)), "blue in the middle at 3.5 s").toBe(true);
    for (const x of [10, 310]) expect(isBlack(pixel(file, 2.5, x, 120, 320)), `black band at x=${x}`).toBe(true);
    expect(isRed(pixel(file, 0.5, 10, 120, 320)), "the first clip fills the frame").toBe(true);
    expect(isRed(pixel(file, 4.5, 10, 120, 320)), "the last clip fills the frame").toBe(true);
    expect(level(file, 0.3, 1.7)).toBeGreaterThan(1000);
    expect(level(file, 2.3, 3.7)).toBeGreaterThan(1000);
    expect(level(file, 4.2, 4.8), "silence for the clip without sound").toBeLessThan(50);
  });

  test("one video disables the action; a fake file in the list is named in the error", async ({ page }) => {
    await openWithFiles(page, "/en/join-videos", ["video.webm"]);
    const action = page.getByRole("button", { name: "Join videos", exact: true });
    await expect(action).toBeDisabled();
    await page.locator('input[type="file"]').first().setInputFiles([join(__dirname, "../fixtures/video.mkv"), join(__dirname, "../fixtures/corrupt/not-video.mp4")]);
    await expect(action).toBeEnabled();
    await action.click();
    const alert = page.locator("main").getByText("not-video.mp4").last();
    await expect(alert).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("main")).toContainText("can't be converted this way");
    await expect(page.getByRole("button", { name: /^Download/ })).toHaveCount(0);
  });
});
