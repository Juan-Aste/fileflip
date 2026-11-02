// Cloud voice of the reader (task 13.3): the production build talks to a
// fake Google Cloud Text-to-Speech (a local HTTP server answering like
// `text:synthesize`), so nothing leaves the machine. The MP3 the page builds
// is checked with ffprobe; the key must never reach the browser and the text
// must never appear in the server's logs.
import { execFileSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { axeViolations } from "./axe";
import { startApp } from "./server/app";
import { expect, test } from "./support";

const appPort = Number(process.env.E2E_PORT ?? 3100) + 21;
const KEY = "e2e-fake-google-key-7f3a9c";
const SECRET_WORD = "Zanahoria";
const SAMPLE = `Primera frase del texto con ${SECRET_WORD}. Segunda frase con más palabras para leer. Tercera y última frase.`;
/** Seconds of audio the fake answers per request. */
const CHUNK_SECONDS = 1;

interface FakeCall {
  key?: string;
  body: { input: { text?: string; ssml?: string }; voice: { name: string; languageCode: string }; audioConfig: { audioEncoding: string; speakingRate: number } };
}

/** A fake `text:synthesize`: a short tone as MP3 (24 kHz mono), after a delay like the real API's. */
async function startFakeGoogle(calls: FakeCall[]) {
  const dir = mkdtempSync(join(tmpdir(), "fileflect-tts-"));
  const mp3 = join(dir, "tone.mp3");
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `sine=frequency=440:duration=${CHUNK_SECONDS}`, "-ar", "24000", "-ac", "1", "-b:a", "32k", mp3]);
  const audioContent = readFileSync(mp3).toString("base64");
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      calls.push({ key: req.headers["x-goog-api-key"] as string | undefined, body: JSON.parse(raw) });
      setTimeout(() => res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ audioContent })), 150);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

function probe(file: string) {
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" }));
  const stream = info.streams[0];
  return { codec: stream.codec_name as string, sampleRate: Number(stream.sample_rate), channels: Number(stream.channels), duration: Number(info.format.duration) };
}

const textArea = (page: Page) => page.getByRole("textbox", { name: /Texto para leer|Text to read|要朗读的文字/ });

test.describe("text-to-speech: cloud AI voice (fake Google)", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });
  let app: ChildProcess;
  let google: Server;
  let base: string;
  const calls: FakeCall[] = [];
  let logs = "";

  test.beforeAll(async () => {
    test.setTimeout(180_000);
    google = await startFakeGoogle(calls);
    app = await startApp(
      appPort,
      {
        AUTH_SECRET: "e2e-only-not-a-real-secret",
        GOOGLE_TTS_API_KEY: KEY,
        GOOGLE_TTS_ENDPOINT: `http://127.0.0.1:${(google.address() as AddressInfo).port}/v1/text:synthesize`,
      },
      (chunk) => (logs += chunk),
    );
    base = `http://127.0.0.1:${appPort}`;
  });

  test.afterAll(() => {
    app?.kill();
    google?.close();
  });

  test("reads sentence by sentence with the cloud voice; the key never reaches the browser", async ({ page }) => {
    const bodies: string[] = [];
    page.on("response", async (response) => {
      if (!response.url().startsWith(base)) return;
      const type = response.headers()["content-type"] ?? "";
      if (/javascript|json|html|text/.test(type)) bodies.push(await response.text().catch(() => ""));
    });
    await page.goto(`${base}/es/leer-texto-en-voz-alta`, { waitUntil: "networkidle" });
    const cloud = page.getByRole("radio", { name: "Voz IA (nube)" });
    await expect(cloud).toBeEnabled();
    await expect(page.getByTestId("tts-cloud-notice")).toHaveText(/tu texto se envía a Google para generar la voz y no lo guardamos/);
    // The device voices stay the default.
    await expect(page.getByRole("radio", { name: "Voces del dispositivo" })).toBeChecked();
    await cloud.check();
    await expect(page.getByLabel("Voz", { exact: true }).locator("option")).toHaveText([/^Mujer 1 · /, /^Hombre 1 · /, /^Mujer 2 · /]);

    await textArea(page).fill(SAMPLE);
    calls.length = 0;
    await page.getByRole("button", { name: "Reproducir" }).click();
    await expect(page.getByTestId("tts-current")).toHaveText(`Primera frase del texto con ${SECRET_WORD}.`);
    await expect(page.getByTestId("tts-current")).toHaveText("Segunda frase con más palabras para leer.", { timeout: 10_000 });
    await expect(page.locator("main").getByRole("status")).toHaveText("Lectura terminada", { timeout: 15_000 });

    // One request per sentence, plain text (never SSML), the chosen voice, the key in a header.
    expect(calls.map((c) => c.body.input.text)).toEqual(SAMPLE.match(/[^.]+\./g)!.map((s) => s.trim()));
    for (const call of calls) {
      expect(call.key).toBe(KEY);
      expect(call.body.input.ssml).toBeUndefined();
      expect(call.body.voice).toEqual({ name: "es-US-Wavenet-A", languageCode: "es-US" });
      expect(call.body.audioConfig).toMatchObject({ audioEncoding: "MP3", speakingRate: 1 });
    }
    expect(bodies.length).toBeGreaterThan(5);
    for (const body of bodies) expect(body).not.toContain(KEY);
    // The text is never logged by the server.
    expect(logs).not.toContain(SECRET_WORD);
  });

  test("Download MP3 joins the cloud sentences into one valid MP3 (ffprobe), also in Chinese", async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), "fileflect-tts-mp3-"));
    for (const [path, text, sentences, voice] of [
      ["/es/leer-texto-en-voz-alta", SAMPLE, 3, "es-US-Wavenet-A"],
      ["/zh/text-to-speech", "第一句话。第二句话。", 2, "cmn-CN-Wavenet-A"],
    ] as const) {
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      await textArea(page).fill(text);
      calls.length = 0;
      const button = page.getByRole("button", { name: /Descargar MP3|下载 MP3/ });
      await expect(button).toBeEnabled();
      const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
      const file = join(dir, `${sentences}.mp3`);
      await download.saveAs(file);
      const info = probe(file);
      expect(info).toMatchObject({ codec: "mp3", sampleRate: 24000, channels: 1 });
      // Each sentence's audio plus the 0.3 s pause between sentences.
      const expected = sentences * CHUNK_SECONDS + (sentences - 1) * 0.3;
      expect(info.duration).toBeGreaterThan(expected - 0.15);
      expect(info.duration).toBeLessThan(expected + 0.25);
      expect(calls).toHaveLength(sentences);
      expect(calls[0]!.body.voice.name).toBe(voice);
      // Decodes end to end without errors.
      execFileSync("ffmpeg", ["-v", "error", "-xerror", "-i", file, "-f", "null", "-"]);
    }
    writeFileSync(join(dir, "done"), "");
    expect(logs).not.toContain(SECRET_WORD);
  });

  test("other sites can't use the endpoint", async ({ request }) => {
    const status = await (await request.get(`${base}/api/tts`)).json();
    expect(status).toMatchObject({ enabled: true, available: true });
    expect(JSON.stringify(status)).not.toContain(KEY);
    const response = await request.post(`${base}/api/tts`, {
      headers: { origin: "https://evil.example" },
      data: { text: "Hola", voice: "es-US-Wavenet-A", token: status.token },
    });
    expect(response.status()).toBe(400);
  });
});

test("without GOOGLE_TTS_API_KEY the cloud voice is not offered", async ({ page }) => {
  await page.goto("/es/leer-texto-en-voz-alta", { waitUntil: "networkidle" });
  await expect(page.getByRole("radio", { name: "Voces del dispositivo" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Voz IA (nube)" })).toHaveCount(0);
  await expect(page.getByTestId("tts-cloud-notice")).toHaveCount(0);
});

// The same reader in every engine with /api/tts answered by the test (the
// server path is covered above): the order of the options, reading with the
// cloud voice, the monthly cap and axe in light and dark.
test.describe("text-to-speech: the three options (API stubbed)", () => {
  let tone: Buffer;
  test.beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), "fileflect-tts-stub-"));
    const file = join(dir, "tone.mp3");
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=330:duration=1", "-ar", "24000", "-ac", "1", "-b:a", "32k", file]);
    tone = readFileSync(file);
  });

  async function stubApi(page: Page, available: boolean) {
    const posts: string[] = [];
    await page.route("**/api/tts", (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { enabled: true, available, maxChars: 1500, token: "stub" } });
      posts.push(JSON.parse(route.request().postData() ?? "{}").text);
      return route.fulfill({ body: tone, contentType: "audio/mpeg" });
    });
    return posts;
  }

  for (const colorScheme of ["light", "dark"] as const) {
    test(`Listen first, then AI voice (cloud), then private mode; reads with the cloud voice; axe (${colorScheme})`, { tag: "@xb" }, async ({ page, browserName }) => {
      await page.emulateMedia({ colorScheme });
      const posts = await stubApi(page, true);
      await page.goto("/es/leer-texto-en-voz-alta", { waitUntil: "networkidle" });
      const radios = page.getByRole("radio");
      await expect(radios).toHaveCount(3);
      expect(await radios.evaluateAll((els) => els.map((e) => e.closest("label")!.textContent!.trim()))).toEqual([
        "Escuchar (voces del dispositivo)",
        "Voz IA (nube)",
        "Modo privado (voz IA en tu dispositivo)",
      ]);
      await expect(radios.first()).toBeChecked();
      await expect(page.getByTestId("tts-cloud-notice")).toHaveText(/se envía a Google/);
      await textArea(page).fill("Una frase corta. Otra frase.");
      // The MP3 uses the cloud voice when it is available.
      await expect(page.getByText(/El MP3 se genera con la voz IA en la nube/)).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);

      await page.getByRole("radio", { name: "Voz IA (nube)" }).check();
      await page.getByRole("button", { name: "Reproducir" }).click();
      await expect(page.getByTestId("tts-current")).toHaveText("Una frase corta.");
      expect(await axeViolations(page)).toEqual([]);
      // Headless Firefox in the test container has no audio output: its
      // AudioContext clock never advances, so the reading can't end there.
      if (browserName === "firefox") return;
      await expect(page.locator("main").getByRole("status")).toHaveText("Lectura terminada", { timeout: 15_000 });
      expect(posts).toEqual(["Una frase corta.", "Otra frase."]);
    });
  }

  test("at the monthly cap the cloud option turns off and the reader works as before", { tag: "@xb" }, async ({ page }) => {
    const posts = await stubApi(page, false);
    await page.goto("/es/leer-texto-en-voz-alta", { waitUntil: "networkidle" });
    await expect(page.getByRole("radio", { name: "Voz IA (nube)" })).toBeDisabled();
    await expect(page.getByTestId("tts-cloud-notice")).toHaveText(/no está disponible por este mes/);
    await textArea(page).fill("Una frase corta.");
    // The MP3 falls back to the private mode (Supertonic), with its license link.
    await expect(page.getByRole("button", { name: "Descargar MP3" })).toBeEnabled();
    await expect(page.getByText(/El MP3 se genera con la voz IA \(Supertonic 3\)/)).toBeVisible();
    await expect(page.getByRole("radio", { name: "Escuchar" })).toBeChecked();
    expect(posts).toEqual([]);
  });
});
