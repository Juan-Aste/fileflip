// Old video and audio formats through the FFmpeg WASM fallback (src/lib/legacy-media):
// inputs generated here with the system's ffmpeg from the 2 s fixtures (red then blue,
// left 440 Hz / right 660 Hz), or by hand (AMR); outputs checked with ffprobe/ffmpeg.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, fileOf, fixturePath, runTool, test } from "./support";

const hasFfmpeg = (() => {
  try {
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const dir = mkdtempSync(join(tmpdir(), "legacy-e2e-"));

function make(name: string, from: string, args: string[]) {
  const file = join(dir, name);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", fixturePath(from), ...args, file]);
  return file;
}

function amr(name: string, frames: number) {
  const out = new Uint8Array(6 + frames * 32);
  out.set(new TextEncoder().encode("#!AMR\n"));
  let seed = 3;
  for (let f = 0; f < frames; f++) {
    out[6 + f * 32] = (7 << 3) | 0x04;
    for (let i = 1; i < 32; i++) out[6 + f * 32 + i] = seed = (seed * 1103515245 + 12345) & 0xff;
  }
  const file = join(dir, name);
  writeFileSync(file, out);
  return file;
}

function probe(buf: Buffer, name: string) {
  const file = join(dir, `out-${name}`);
  writeFileSync(file, buf);
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }));
  const v = info.streams.find((s: { codec_type: string }) => s.codec_type === "video");
  const a = info.streams.find((s: { codec_type: string }) => s.codec_type === "audio");
  const color = (at: number) => [...execFileSync("ffmpeg", ["-v", "error", "-ss", String(at), "-i", file, "-frames:v", "1", "-vf", "scale=1:1:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])];
  const tones = () => {
    const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-vn", "-f", "s16le", "-ac", "2", "-ar", "44100", "-"], { maxBuffer: 64 * 1024 * 1024 });
    const s = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
    const frames = s.length / 2;
    const [from, to] = [Math.floor(frames * 0.25), Math.floor(frames * 0.75)];
    return [0, 1].map((ch) => {
      let crossings = 0;
      for (let i = from + 1; i < to; i++) if (s[i * 2 + ch]! >= 0 !== s[(i - 1) * 2 + ch]! >= 0) crossings++;
      return Math.round(crossings / 2 / ((to - from) / 44100));
    });
  };
  return { format: info.format.format_name as string, video: v?.codec_name as string | undefined, audio: a?.codec_name as string | undefined, size: v ? `${v.width}x${v.height}` : "", duration: Number(info.format.duration), color, tones };
}

test.describe("old formats (FFmpeg WASM fallback)", () => {
  test.skip(!hasFfmpeg, "needs ffmpeg/ffprobe to make the inputs and check the outputs");
  test.setTimeout(180_000);

  test.afterEach(({ serverCalls }) => {
    expect(serverCalls, "old formats are converted in the browser").toEqual([]);
  });

  const videos = [
    { name: "video.avi", args: ["-c:v", "mpeg4", "-q:v", "3", "-c:a", "libmp3lame", "-b:a", "192k", "-f", "avi"] },
    { name: "video.wmv", args: ["-c:v", "wmv2", "-b:v", "2M", "-c:a", "wmav2", "-b:a", "192k", "-f", "asf"] },
    { name: "video.flv", args: ["-c:v", "flv", "-b:v", "2M", "-c:a", "libmp3lame", "-b:a", "192k", "-f", "flv"] },
    { name: "video.mpg", args: ["-c:v", "mpeg2video", "-b:v", "3M", "-c:a", "mp2", "-b:a", "192k", "-f", "vob"] },
  ];
  for (const { name, args } of videos) {
    test(`${name} → MP4 in the video converter, picture and sound intact`, async ({ page }) => {
      const input = make(name, "video.mp4", args);
      const core: string[] = [];
      page.on("request", (r) => {
        if (r.url().includes("/ffmpeg/core-")) core.push(new URL(r.url()).pathname);
      });
      await page.goto("/en/video-converter", { waitUntil: "networkidle" });
      expect(core, "the FFmpeg core is not loaded with the page").toEqual([]);
      await page.locator('input[type="file"]').first().setInputFiles(input);
      const out = fileOf(await runTool(page, "Convert video"));
      expect(out.name).toBe(name.replace(/\.\w+$/, ".mp4"));
      expect(core.some((p) => p.endsWith("ffmpeg-core.wasm")), "the core comes from our domain").toBe(true);
      const p = probe(out.buf, out.name);
      expect(p.format).toContain("mp4");
      expect(["h264", "vp9", "av1"]).toContain(p.video);
      expect(p.size).toBe("320x240");
      expect(Math.abs(p.duration - 2), `lasts ${p.duration} s`).toBeLessThan(0.2);
      const [red, blue] = [p.color(0.5), p.color(1.5)];
      expect(red[0]! > 170 && red[2]! < 90, `red at 0.5 s: ${red}`).toBe(true);
      expect(blue[2]! > 170 && blue[0]! < 90, `blue at 1.5 s: ${blue}`).toBe(true);
      const [left, right] = p.tones();
      expect(Math.abs(left! - 440), `left ${left} Hz`).toBeLessThan(15);
      expect(Math.abs(right! - 660), `right ${right} Hz`).toBeLessThan(15);
    });
  }

  test("WMA and AC-3 → MP3 in the audio converter, both channels intact; AMR (voice note) → MP3", async ({ page }) => {
    const wma = make("audio.wma", "audio.wav", ["-c:a", "wmav2", "-b:a", "192k", "-f", "asf"]);
    const ac3 = make("audio.ac3", "audio.wav", ["-c:a", "ac3", "-b:a", "192k"]);
    const note = amr("voice.amr", 150);
    await page.goto("/en/audio-converter", { waitUntil: "networkidle" });
    for (const [file, stereo] of [[wma, true], [ac3, true], [note, false]] as const) {
      await page.locator('input[type="file"]').first().setInputFiles(file);
      const out = fileOf(await runTool(page, "Convert audio"));
      expect(out.name.endsWith(".mp3")).toBe(true);
      const p = probe(out.buf, out.name);
      expect(p.audio).toBe("mp3");
      if (stereo) {
        expect(Math.abs(p.duration - 2), `${file} lasts ${p.duration} s`).toBeLessThan(0.2);
        const [left, right] = p.tones();
        expect(Math.abs(left! - 440), `${file} left ${left} Hz`).toBeLessThan(15);
        expect(Math.abs(right! - 660), `${file} right ${right} Hz`).toBeLessThan(15);
      } else {
        expect(Math.abs(p.duration - 3), `AMR lasts ${p.duration} s`).toBeLessThan(0.2);
      }
      await page.getByRole("button", { name: "Start over" }).click();
    }
  });

  test("a fake AVI fails with a clear message", async ({ page }) => {
    const fake = join(dir, "fake.avi");
    writeFileSync(fake, readFileSync(fixturePath("audio.wav")).subarray(0, 200));
    await page.goto("/en/video-converter", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles(fake);
    const result = await runTool(page, "Convert video");
    expect(result.error).toBeTruthy();
  });
});
