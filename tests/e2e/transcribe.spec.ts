// Audio to text with Whisper in the browser. The model files come from
// Hugging Face at a pinned commit; with WHISPER_DIR (tiny/ and base/ copies of
// the pinned files, as for the unit tests) they are served from disk, else
// they are downloaded. The subtitles are read back by ffmpeg (independent of
// our writer and parser).
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BrowserContext, Page } from "@playwright/test";
import { expect, fixturePath, test, toolAlert } from "./support";

const PREFIX = "https://huggingface.co/onnx-community/";
const dir = process.env.WHISPER_DIR;
const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "audio is transcribed in the browser").toEqual([]);
});

/** Records the model files asked for ("whisper-tiny/<rev>/onnx/…"), served from WHISPER_DIR or failed with `status`. */
async function serveModel(context: BrowserContext, { status }: { status?: number } = {}) {
  const requests: string[] = [];
  await context.route(`${PREFIX}**`, async (route) => {
    const path = route.request().url().slice(PREFIX.length);
    requests.push(path);
    if (status) return route.fulfill({ status, headers: { "access-control-allow-origin": "*" } });
    const [repo, , , ...file] = path.split("/");
    const local = dir && join(dir, repo!.replace("whisper-", ""), ...file);
    if (local && existsSync(local)) return route.fulfill({ status: 200, path: local, headers: { "access-control-allow-origin": "*", "content-type": "application/octet-stream" } });
    return route.continue();
  });
  return requests;
}

async function open(page: Page, file: string) {
  await page.goto("/es/transcribir-audio-a-texto", { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(fixturePath(file));
}

async function download(page: Page, label: string) {
  const [file] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: label }).click()]);
  return { name: file.suggestedFilename(), text: readFileSync((await file.path())!, "utf8") };
}

/** ffmpeg reads the subtitles and writes them back as SRT. */
function ffmpegSrt(content: string, ext: string) {
  const tmp = mkdtempSync(join(tmpdir(), "transcribe-e2e-"));
  writeFileSync(join(tmp, `in.${ext}`), content);
  return execFileSync("ffmpeg", ["-v", "error", "-i", join(tmp, `in.${ext}`), "-f", "srt", "-"], { encoding: "utf8" });
}

test.describe("tool: audio-to-text", () => {
  test("transcribes a recording, then a video from the cached model; TXT, SRT and VTT @xb", async ({ page, context }) => {
    test.setTimeout(300_000);
    const requests = await serveModel(context);
    await open(page, "speech-ai-en.ogg");
    await expect(page.getByText("duración 0:07")).toBeVisible();
    // Nothing is downloaded before asking, and the size is shown.
    await expect(page.getByText(/La primera vez se descargan 4\d[,.]\d MB desde Hugging Face/)).toBeVisible();
    expect(requests).toEqual([]);

    await page.getByRole("button", { name: "Transcribir", exact: true }).click();
    const text = page.getByLabel("Transcripción");
    await expect(text).toBeVisible({ timeout: 240_000 });
    // Our AI voice reading two sentences: two lines, every word.
    const transcript = (await text.inputValue()).toLowerCase();
    expect(transcript.split("\n")).toHaveLength(2);
    expect(transcript).toContain("short transcription test");
    expect(transcript).toContain("quick brown fox jumps over the lazy dog");
    await expect(page.getByText(/Idioma detectado: (Inglés|inglés)/)).toBeVisible();
    // Only the fast model's pinned files, each once.
    expect(requests.length).toBe(6);
    for (const r of requests) expect(r.startsWith("whisper-tiny/resolve/ff4177021cc41f7db950912b73ea4fdf7d01d8e7/")).toBe(true);

    // A corrected word reaches the subtitles; the lines still match the segments.
    await text.fill((await text.inputValue()).replace(/fox/i, "zorro"));
    const srt = await download(page, "Descargar SRT");
    expect(srt.name).toBe("speech-ai-en.srt");
    expect(srt.text).toMatch(/^1\n00:00:00,000 --> 00:00:0\d,\d{3}\nHello, this is a short transcription test\.\n\n2\n00:00:0\d,\d{3} --> 00:00:0\d,\d{3}\n/);
    expect(srt.text).toContain("zorro");
    const vtt = await download(page, "Descargar VTT");
    expect(vtt.text.startsWith("WEBVTT\n\n")).toBe(true);
    const txt = await download(page, "Descargar TXT");
    expect(txt.name).toBe("speech-ai-en.txt");
    expect(txt.text.toLowerCase()).toContain("zorro");
    if (hasFfmpeg) {
      for (const [content, ext] of [[srt.text, "srt"], [vtt.text, "vtt"]]) expect(ffmpegSrt(content!, ext!)).toContain("zorro");
    }
    await expect(page.getByRole("link", { name: "Ajustar los tiempos de los subtítulos" })).toHaveAttribute("href", "/es/sincronizar-subtitulos");

    // A video, with the language chosen: the model now comes from the browser's cache.
    await expect(page.getByText("ya descargado").first()).toBeVisible();
    await page.locator('input[type="file"]').first().setInputFiles(fixturePath("speech-ai-en.webm"));
    await expect(page.getByText("duración 0:07")).toBeVisible();
    await page.getByLabel("Idioma del audio").selectOption("en");
    await page.getByRole("button", { name: "Transcribir", exact: true }).click();
    await expect(text).toBeVisible({ timeout: 120_000 });
    expect((await text.inputValue()).toLowerCase()).toContain("quick brown fox");
    expect(requests.length).toBe(6);
  });

  test("a failed download is explained; cancelling stops the download", async ({ page, context }) => {
    test.setTimeout(120_000);
    await serveModel(context, { status: 503 });
    await open(page, "speech-ai-en.ogg");
    await expect(page.getByText("duración 0:07")).toBeVisible();
    await page.getByRole("button", { name: "Transcribir", exact: true }).click();
    await expect(toolAlert(page)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByLabel("Transcripción")).toHaveCount(0);

    // A download that never ends: Cancel gives the button back, with no error.
    await context.unrouteAll();
    await context.route(`${PREFIX}**`, () => new Promise(() => {}));
    await page.getByRole("button", { name: "Transcribir", exact: true }).click();
    await expect(page.getByRole("progressbar", { name: /Descargando el modelo/ })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("button", { name: "Transcribir", exact: true })).toBeEnabled();
    await expect(toolAlert(page)).toHaveCount(0);
  });

  test("rejects files that are not audio or video", async ({ page }) => {
    await page.goto("/es/transcribir-audio-a-texto", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles(fixturePath("document.pdf"));
    await expect(toolAlert(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Transcribir", exact: true })).toBeDisabled();
  });
});
