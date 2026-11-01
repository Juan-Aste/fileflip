// Read aloud with the AI voice (Supertonic 3) and MP3 download. The model is
// fetched from Hugging Face at a pinned commit. The first tests intercept
// those requests (confirmation, cancel, failures, Chinese). With
// TTS_REAL_MODEL=1 the real model is downloaded once (~398 MB, kept in the
// Cache API of one shared browser context): it speaks, and its MP3s are
// checked with ffprobe/ffmpeg (independent of the app and of mediabunny).
// Playwright cannot fulfill routes that large, so those go to the network.
// With TTS_MODEL_PROFILE (a directory) the context is a persistent browser
// profile: the CI caches it, so the model is downloaded once per version.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { axeViolations } from "./axe";
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

  test("each voice can be heard from a static sample before the model is downloaded @xb", async ({ page, context }) => {
    const requests = await serveModel(context, { status: 503 });
    const samples: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/tts-samples/")) samples.push(new URL(r.url()).pathname);
    });
    await page.goto("/es/leer-texto-en-voz-alta", { waitUntil: "networkidle" });
    await page.locator("textarea").fill("Hola. Esta es una prueba de voz.");
    // Nothing is fetched until a sample is played (Lighthouse, data).
    expect(samples).toEqual([]);
    await page.getByText("Escuchar las voces IA antes de descargar").click();
    await expect(page.getByText(/Todas las voces usan el mismo modelo: la descarga es la misma para cualquiera \(unos 3[78]\d[.,]\d MB\)/)).toBeVisible();
    await expect(page.getByText("Recomendada", { exact: true })).toHaveCount(1);
    expect(await axeViolations(page)).toEqual([]);
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await axeViolations(page)).toEqual([]);
    await page.emulateMedia({ colorScheme: "light" });
    await page.getByRole("button", { name: "Escuchar muestra: Hombre 2" }).click();
    // WebKit asks for a media file twice (a byte-range probe, then the data).
    await expect.poll(() => [...new Set(samples)]).toEqual(["/tts-samples/es-M2.mp3"]);
    const response = await page.request.get("/tts-samples/es-M2.mp3");
    expect(response.headers()["content-type"]).toMatch(/audio\/mpeg/);
    // Choosing a voice switches to the AI voice without downloading the model.
    await page.getByRole("button", { name: "Elegir Hombre 2" }).click();
    await expect(page.getByRole("radio", { name: "Voz IA" })).toBeChecked();
    await expect(page.getByRole("combobox", { name: "Voz" })).toHaveValue("M2");
    await expect(page.getByRole("button", { name: "Elegida" })).toHaveAttribute("aria-pressed", "true");
    expect(requests).toEqual([]);
    // Another language plays that language's sample.
    await page.getByLabel("Idioma", { exact: true }).selectOption("fr");
    await page.getByRole("button", { name: "Escuchar muestra: Mujer 3" }).click();
    await expect.poll(() => samples).toContain("/tts-samples/fr-F3.mp3");
    expect(requests).toEqual([]);
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
  test.beforeAll(async ({ browser }: { browser: Browser }, info) => {
    const options = { locale: "es-ES", acceptDownloads: true, ignoreHTTPSErrors: Boolean(process.env.E2E_IGNORE_HTTPS_ERRORS), baseURL: info.project.use.baseURL };
    const profile = process.env.TTS_MODEL_PROFILE;
    // A profile restored on another machine keeps Chromium's single-instance locks.
    if (profile) for (const lock of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) rmSync(join(profile, lock), { force: true });
    context = profile
      ? await chromium.launchPersistentContext(profile, {
          ...options,
          executablePath: info.project.use.launchOptions?.executablePath,
          // A reused profile remembers the previous run's (deleted) download folder.
          downloadsPath: mkdtempSync(join(tmpdir(), "tts-downloads-")),
        })
      : await browser.newContext(options);
    await context.route("**/api/stats", (route) => route.fulfill({ status: 204 }));
    await context.route("**/api/visit", (route) => route.fulfill({ status: 204 }));
    page = context.pages()[0] ?? (await context.newPage());
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
    // A cached profile (CI) already has the model: no confirmation then.
    const confirm = page.getByRole("button", { name: "Descargar la voz IA" });
    const current = page.getByTestId("tts-current");
    await expect(confirm.or(current)).toBeVisible({ timeout: 60_000 });
    const downloaded = await confirm.isVisible();
    if (downloaded) await confirm.click();
    await expect(current).toHaveText(first, { timeout: 500_000 });
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
    const files = ["onnx/tts.json", "onnx/unicode_indexer.json", "onnx/duration_predictor.onnx", "onnx/text_encoder.onnx", "onnx/vector_estimator.onnx", "onnx/vocoder.onnx", "voice_styles/F5.json"]; // F5: the recommended Spanish voice
    if (downloaded) expect(new Set(requests)).toEqual(new Set(files));
    else expect(requests).toEqual([]);

    // Next visit: no confirmation, nothing downloaded again (Cache API).
    requests.length = 0;
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("textarea").fill("Otra frase corta.");
    await page.getByRole("button", { name: "Reproducir" }).click();
    await expect.poll(async () => (await started()).length, { timeout: 120_000 }).toBeGreaterThan(0);
    await expect(page.getByText(/necesita descargar/)).toBeHidden();
    expect(requests).toEqual([]);
  });

  // Task 13.1 (docs/tts-pausas.md): silence between sentences beyond the 0.3 s
  // pause that belongs to the text. Each source start is recorded on the audio
  // clock; the extra silence is start(n + 1) − (start(n) + length of n, pause included).
  test("no silence between sentences beyond the text's pause", async () => {
    test.setTimeout(600_000);
    await page.addInitScript(() => {
      const w = window as unknown as { __timeline: { startAt: number; duration: number }[] };
      w.__timeline = [];
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (when?: number, ...rest: number[]) {
        w.__timeline.push({ startAt: Math.max(when ?? 0, this.context.currentTime), duration: this.buffer?.duration ?? 0 });
        return start.call(this, when, ...rest);
      };
    });
    const text = [
      "La lectura en voz alta ayuda a revisar un texto antes de enviarlo.",
      "Se escucha mejor el ritmo de cada frase.",
      "También aparecen los errores que se pasan por alto al leer en silencio.",
      "Por eso conviene probarla con un párrafo largo.",
      "Cada oración se genera mientras suena la anterior.",
      "Así no debería quedar ningún silencio extra entre una y otra.",
      "Esta es la última frase de la prueba.",
    ];
    await chooseAiVoice(page, "/es/leer-texto-en-voz-alta", text.join(" "));
    await page.getByRole("button", { name: "Reproducir" }).click();
    // Run alone (-g), the model may not be downloaded yet.
    const confirm = page.getByRole("button", { name: "Descargar la voz IA" });
    await expect(confirm.or(page.getByTestId("tts-current"))).toBeVisible({ timeout: 60_000 });
    if (await confirm.isVisible()) await confirm.click();
    await expect(page.getByText("Lectura terminada")).toBeAttached({ timeout: 500_000 });
    const timeline = await page.evaluate(() => (window as unknown as { __timeline: { startAt: number; duration: number }[] }).__timeline);
    expect(timeline).toHaveLength(text.length);
    const gaps = timeline.slice(1).map((s, i) => Math.round((s.startAt - (timeline[i].startAt + timeline[i].duration)) * 1000));
    test.info().annotations.push({ type: "gaps-ms", description: gaps.join(", ") });
    console.log(`silence between sentences beyond the pause (ms): ${gaps.join(", ")}`);
    if (!process.env.TTS_GAPS_BASELINE) expect(Math.max(...gaps)).toBeLessThan(150);
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
