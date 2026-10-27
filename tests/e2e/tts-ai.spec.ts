// Read aloud with the AI voice (Supertonic 3) and MP3 download. The model is
// fetched from Hugging Face at a pinned commit. The first tests intercept
// those requests (confirmation, cancel, failures, Chinese). With
// TTS_REAL_MODEL=1 the real model is downloaded once (~398 MB, kept in the
// Cache API of one shared browser context): it speaks, and its MP3s are
// checked with ffprobe/ffmpeg (independent of the app and of mediabunny).
// Playwright cannot fulfill routes that large, so those go to the network.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { expect, test, toolAlert } from "./support";

const MODEL_PREFIX = "https://huggingface.co/Supertone/supertonic-3/resolve/";
const realModel = Boolean(process.env.TTS_REAL_MODEL);

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "speech is generated in the browser").toEqual([]);
});

/** Serves the model from `dir` (or fails every request with `status`), recording what was asked. */
async function serveModel(context: BrowserContext, { status }: { status: number }) {
  const requests: string[] = [];
  await context.route(`${MODEL_PREFIX}**`, async (route) => {
    requests.push(route.request().url().slice(MODEL_PREFIX.length).split("/").slice(1).join("/"));
    return route.fulfill({ status, headers: { "access-control-allow-origin": "*" } });
  });
  return requests;
}

/** Model files the page asked Hugging Face for (they go to the network). */
function watchModel(page: Page) {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().startsWith(MODEL_PREFIX)) requests.push(r.url().slice(MODEL_PREFIX.length).split("/").slice(1).join("/"));
  });
  return requests;
}

async function chooseAiVoice(page: Page, path: string, text: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.locator("textarea").fill(text);
  await page.getByRole("radio", { name: /Voz IA|AI voice|Voix IA/ }).check();
}

test.describe("tool: text-to-speech, AI voice", () => {
  test("asks before downloading, with the size; cancelling downloads nothing", async ({ page, context }) => {
    const requests = await serveModel(context, { status: 503 });
    await chooseAiVoice(page, "/es/leer-texto-en-voz-alta", "Hola. Esta es una prueba.");
    // The model is never fetched when the page opens or the option is picked.
    expect(requests).toEqual([]);
    await page.getByRole("button", { name: "Reproducir" }).click();
    await expect(page.getByText(/necesita descargar unos 38\d[.,]\d MB desde Hugging Face/)).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText(/necesita descargar/)).toBeHidden();
    expect(requests).toEqual([]);
    // The choice is remembered.
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("radio", { name: "Voz IA" })).toBeChecked();
  });

  test("a failed download says so and the device voices still work", async ({ page, context }) => {
    const requests = await serveModel(context, { status: 503 });
    await chooseAiVoice(page, "/en/text-to-speech", "Hello there. This is a test.");
    await page.getByRole("button", { name: "Download MP3" }).click();
    await page.getByRole("button", { name: "Download the AI voice" }).click();
    await expect(toolAlert(page)).toContainText(/unavailable|try again/i);
    expect(requests.length).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "Play" })).toBeEnabled();
    await page.getByRole("radio", { name: "Device voices" }).check();
    await expect(page.getByRole("radio", { name: "Device voices" })).toBeChecked();
  });

  test("Chinese has no AI voice: device voices only and MP3 disabled, with the reason", async ({ page, context }) => {
    const requests = await serveModel(context, { status: 503 });
    await page.goto("/zh/text-to-speech", { waitUntil: "networkidle" });
    await page.locator("textarea").fill("今天天气很好。我们去公园散步吧。");
    await expect(page.getByRole("radio", { name: "AI 语音" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "下载 MP3" })).toBeDisabled();
    await expect(page.getByText("AI 语音不支持中文：将使用设备语音朗读。")).toBeVisible();
    await expect(page.getByText(/MP3 下载使用 AI 语音/)).toBeVisible();
    expect(requests).toEqual([]);
  });
});

/** ffprobe/ffmpeg view of an MP3: codec, duration and loudness. */
function probeMp3(buf: Buffer) {
  const file = join(mkdtempSync(join(tmpdir(), "tts-")), "speech.mp3");
  writeFileSync(file, buf);
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }));
  const stream = info.streams[0];
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "s16le", "-ac", "1", "-ar", "44100", "-"], { maxBuffer: 256 * 1024 * 1024 });
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  let energy = 0;
  for (const s of samples) energy += (s / 32768) ** 2;
  return {
    format: info.format.format_name as string,
    codec: stream.codec_name as string,
    channels: stream.channels as number,
    sampleRate: Number(stream.sample_rate),
    duration: samples.length / 44100,
    rms: Math.sqrt(energy / Math.max(1, samples.length)),
  };
}

test.describe("tool: text-to-speech, AI voice with the real model", () => {
  test.skip(!realModel, "set TTS_REAL_MODEL=1 (downloads ~398 MB from Hugging Face once)");
  test.describe.configure({ mode: "serial" });

  // One context for the whole block: the model is downloaded once and read from the Cache API after.
  let context: BrowserContext;
  let page: Page;
  let requests: string[];
  const errors: string[] = [];
  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext({ locale: "es-ES", acceptDownloads: true, ignoreHTTPSErrors: Boolean(process.env.E2E_IGNORE_HTTPS_ERRORS) });
    await context.route("**/api/stats", (route) => route.fulfill({ status: 204 }));
    await context.route("**/api/visit", (route) => route.fulfill({ status: 204 }));
    page = await context.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    requests = watchModel(page);
  });
  test.afterAll(async () => {
    await context?.close();
    expect(errors, "uncaught errors on the page").toEqual([]);
  });

  test("speaks progressively with pause and resume, then reads the model from the cache", async () => {
    test.setTimeout(600_000);
    await page.addInitScript(() => {
      const w = window as unknown as { __started: number[] };
      w.__started = [];
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
        w.__started.push(this.buffer?.duration ?? 0);
        return start.apply(this, args);
      };
    });
    const started = () => page.evaluate(() => (window as unknown as { __started: number[] }).__started);
    // Long enough sentences that pausing lands inside the first one.
    const first = "Hola, esta es la primera frase de una prueba de lectura con la voz de inteligencia artificial del navegador.";
    const second = "Y esta es la segunda frase del texto.";
    await chooseAiVoice(page, "/es/leer-texto-en-voz-alta", `${first} ${second}`);
    expect(requests).toEqual([]);
    await page.getByRole("button", { name: "Reproducir" }).click();
    await page.getByRole("button", { name: "Descargar la voz IA" }).click();
    await expect(page.getByTestId("tts-current")).toHaveText(first, { timeout: 500_000 });
    await expect.poll(async () => (await started()).length, { timeout: 120_000 }).toBeGreaterThan(0);
    // The first sentence as audio: several seconds (more than 4 characters per second is far too fast).
    expect((await started())[0]).toBeGreaterThan(first.length / 25);
    await page.getByRole("button", { name: "Pausa" }).click();
    await expect(page.getByRole("button", { name: "Reanudar" })).toBeVisible();
    // Paused: the audio clock stops, the sentence stays highlighted.
    await page.waitForTimeout(1500);
    await expect(page.getByTestId("tts-current")).toHaveText(first);
    await page.getByRole("button", { name: "Reanudar" }).click();
    await expect(page.getByTestId("tts-current")).toHaveText(second, { timeout: 120_000 });
    await expect(page.getByText("Lectura terminada")).toBeAttached({ timeout: 120_000 });
    expect(new Set(requests)).toEqual(new Set(["onnx/tts.json", "onnx/unicode_indexer.json", "onnx/duration_predictor.onnx", "onnx/text_encoder.onnx", "onnx/vector_estimator.onnx", "onnx/vocoder.onnx", "voice_styles/F1.json"]));

    // Next visit: no confirmation, nothing downloaded again (Cache API).
    requests.length = 0;
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("textarea").fill("Otra frase corta.");
    await page.getByRole("button", { name: "Reproducir" }).click();
    await expect.poll(async () => (await started()).length, { timeout: 120_000 }).toBeGreaterThan(0);
    await expect(page.getByText(/necesita descargar/)).toBeHidden();
    expect(requests).toEqual([]);
  });

  const samples = [
    { path: "/es/leer-texto-en-voz-alta", text: "Buenos días. Hoy vamos a leer un texto corto en voz alta.", button: "Descargar MP3", name: "Buenos días. Hoy vamos a leer.mp3" },
    { path: "/en/text-to-speech", text: "Good morning. Today we will read a short text out loud.", button: "Download MP3", name: "Good morning. Today we will read.mp3" },
    { path: "/pt/ler-texto-em-voz-alta", text: "Bom dia. Hoje vamos ler um texto curto em voz alta.", button: "Baixar MP3", name: "Bom dia. Hoje vamos ler um.mp3" },
    { path: "/fr/lire-texte-a-voix-haute", text: "Bonjour. Aujourd’hui, nous allons lire un court texte à voix haute.", button: "Télécharger le MP3", name: "Bonjour. Aujourd’hui, nous allons lire un.mp3" },
  ];
  for (const { path, text, button, name } of samples) {
    test(`MP3 in ${path.split("/")[1]}`, async () => {
      test.setTimeout(600_000);
      await chooseAiVoice(page, path, text);
      // Downloaded by the first test: no confirmation now.
      const download = page.waitForEvent("download", { timeout: 300_000 });
      await page.getByRole("button", { name: button }).click();
      const file = await download;
      expect(file.suggestedFilename()).toBe(name);
      const info = probeMp3(readFileSync((await file.path())!));
      expect(info).toMatchObject({ format: "mp3", codec: "mp3", channels: 1, sampleRate: 44100 });
      // Speech is about 12–20 characters per second, plus the pause between the two sentences.
      expect(info.duration).toBeGreaterThan(text.length / 25);
      expect(info.duration).toBeLessThan(text.length / 6);
      expect(info.rms).toBeGreaterThan(0.01);
    });
  }
});
