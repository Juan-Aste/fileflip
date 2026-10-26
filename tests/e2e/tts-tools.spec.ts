// Read aloud (text to speech): the text of each input format is extracted in
// the browser and shown for editing; reading uses the Web Speech API, which
// test browsers have without voices, so a fake `speechSynthesis` records what
// is spoken and fires word boundaries and ends on a timer.
import type { Page } from "@playwright/test";
import { expect, fixturePath, test } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "text is extracted in the browser").toEqual([]);
});

const textArea = (page: Page) => page.getByRole("textbox", { name: /Texto para leer|Text to read/ });

async function openFile(page: Page, name: string) {
  await page.getByTestId("tts-file").setInputFiles(fixturePath(name));
}

test.describe("tool: text-to-speech", () => {
  test("TXT, Markdown, HTML, Word, EPUB and PDF → editable text", { tag: "@xb" }, async ({ page }) => {
    await page.goto("/es/leer-texto-en-voz-alta", { waitUntil: "networkidle" });
    await openFile(page, "document.docx");
    await expect(textArea(page)).toHaveValue(/^Fileflect sample document\n\nSynthetic paragraph for automated conversion tests\. Acentos: áéíóú ñ\./);
    await expect(page.getByText("Texto de «document.docx»")).toBeVisible();

    await openFile(page, "document.md");
    await expect(textArea(page)).toHaveValue(/^Informe ñandú\n\nTexto con negrita, cursiva y tachado\./);
    await expect(textArea(page)).not.toHaveValue(/\*\*|pwned/);

    await openFile(page, "page.html");
    await expect(textArea(page)).toHaveValue(/^Guía 中文\n\nHola mundo y bienvenidos\./);
    await expect(page.getByText("Detectado: Español")).toBeVisible();

    await openFile(page, "book.epub");
    await expect(textArea(page)).not.toHaveValue(/Guía/);
    await expect(textArea(page)).not.toHaveValue(/<[a-z]/);

    // Typed text works too, and the detected language follows it.
    await textArea(page).fill("The cat is on the table and the dog is in the garden.");
    await expect(page.getByText("Detectado: English")).toBeVisible();
    await expect(page.getByLabel("Idioma", { exact: true })).toHaveValue("en");

    await openFile(page, "document.pdf");
    await expect(textArea(page)).toHaveValue(/^Fileflect sample page 1 of 3\nSynthetic text for automated tests\.\n\nFileflect sample page 2 of 3/);
  });

  test("an image is read with OCR in the page's language", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/es/leer-texto-en-voz-alta", { waitUntil: "networkidle" });
    await openFile(page, "ocr-es.png");
    await expect(textArea(page)).toHaveValue(/kiwi y papaya en enero\./, { timeout: 90_000 });
    await expect(textArea(page)).toHaveValue(/¿Cuánto cuesta\? 1\.250 pesos\./);
  });

  test("long text is cut to the limit with a notice; empty, scanned and unknown files say why", async ({ page }) => {
    await page.goto("/en/text-to-speech", { waitUntil: "networkidle" });
    const long = "The quick brown fox jumps over the lazy dog. ".repeat(1200);
    await page.getByTestId("tts-file").setInputFiles({ name: "long.txt", mimeType: "text/plain", buffer: Buffer.from(long) });
    await expect(page.getByText(/The text had 53,999 characters: it was cut to the first 50,000\./)).toBeVisible();
    expect((await textArea(page).inputValue()).length).toBe(50_000);
    await expect(page.getByText("You reached the limit of 50,000 characters.")).toBeVisible();

    await page.getByTestId("tts-file").setInputFiles({ name: "empty.txt", mimeType: "text/plain", buffer: Buffer.alloc(0) });
    await expect(page.locator("main [role=alert]")).toBeVisible();
    await page.getByTestId("tts-file").setInputFiles(fixturePath("scan.pdf"));
    await expect(page.locator("main [role=alert]")).toContainText(/scan|text/i);
    await page.getByTestId("tts-file").setInputFiles(fixturePath("audio.mp3"));
    await expect(page.locator("main [role=alert]")).toBeVisible();
    // The text already loaded stays.
    expect((await textArea(page).inputValue()).length).toBe(50_000);
  });
});

/**
 * A fake `speechSynthesis`: records each utterance (text, rate, voice) and
 * reads it one word every `__tts.wordMs` ms, firing word boundaries and the
 * end. `cancel()` interrupts like browsers do. Two Spanish voices (one on the
 * device, one online) and an English one with an Android-style tag.
 */
async function fakeSpeech(page: Page, { supported = true } = {}) {
  await page.addInitScript((supported) => {
    if (!supported) {
      delete (window as { speechSynthesis?: unknown }).speechSynthesis;
      Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true });
      return;
    }
    const w = window as unknown as { __tts: { spoken: { text: string; rate: number; voice?: string; lang: string }[]; wordMs: number } };
    w.__tts = { spoken: [], wordMs: 120 };
    const voices = [
      { name: "Google español", lang: "es-ES", voiceURI: "google-es", localService: false, default: false },
      { name: "Mónica", lang: "es-ES", voiceURI: "local-es", localService: true, default: true },
      { name: "Samantha", lang: "en_US", voiceURI: "local-en", localService: true, default: false },
    ];
    class FakeUtterance {
      voice: { voiceURI: string } | null = null;
      lang = "";
      rate = 1;
      onend: ((e: unknown) => void) | null = null;
      onboundary: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      constructor(public text: string) {}
    }
    let current: FakeUtterance | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const synth = Object.assign(new EventTarget(), {
      speaking: false,
      paused: false,
      pending: false,
      getVoices: () => voices,
      speak(u: FakeUtterance) {
        w.__tts.spoken.push({ text: u.text, rate: u.rate, voice: u.voice?.voiceURI, lang: u.lang });
        current = u;
        const words = [...u.text.matchAll(/\S+/g)];
        let i = 0;
        const step = () => {
          if (current !== u) return;
          if (i < words.length) {
            u.onboundary?.({ name: "word", charIndex: words[i]!.index, charLength: words[i]![0].length });
            i++;
            timer = setTimeout(step, w.__tts.wordMs);
          } else {
            current = null;
            u.onend?.({});
          }
        };
        timer = setTimeout(step, 10);
      },
      cancel() {
        clearTimeout(timer);
        const u = current;
        current = null;
        u?.onerror?.({ error: "interrupted" });
      },
      pause() {},
      resume() {},
    });
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
  }, supported);
}

const status = (page: Page) => page.locator("main").getByRole("status");
const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __tts: { spoken: { text: string; rate: number; voice?: string; lang: string }[] } }).__tts.spoken);
const SAMPLE = "Primera frase del texto. Segunda frase con más palabras para leer. Tercera y última frase.";

test.describe("text-to-speech: reading with the device's voices", () => {
  test("plays sentence by sentence with highlight, pauses, resumes, stops and finishes", { tag: "@xb" }, async ({ page }) => {
    await fakeSpeech(page);
    await page.goto("/es/leer-texto-en-voz-alta", { waitUntil: "networkidle" });
    await textArea(page).fill(SAMPLE);
    // Device voices first; online ones are marked and explained.
    const voice = page.getByLabel("Voz", { exact: true });
    await expect(voice).toHaveValue("local-es");
    await expect(voice.locator("option")).toHaveText(["Mónica", "Google español (en línea)"]);
    await expect(page.getByText(/Las voces «en línea» envían el texto/)).toBeVisible();
    await expect(page.getByText("Frase 1 de 3")).toBeVisible();

    await page.getByRole("button", { name: "Reproducir" }).click();
    await expect(page.getByTestId("tts-current")).toHaveText("Primera frase del texto.");
    await expect(page.getByTestId("tts-word")).toHaveText(/^\S+$/);
    expect((await spoken(page))[0]).toEqual({ text: "Primera frase del texto.", rate: 1, voice: "local-es", lang: "es-ES" });
    await expect(status(page)).toHaveText("Leyendo");
    // On to the next sentence by itself.
    await expect(page.getByTestId("tts-current")).toHaveText("Segunda frase con más palabras para leer.", { timeout: 5000 });
    await expect(page.getByText("Frase 2 de 3")).toBeVisible();

    // Pause: nothing more is spoken; resume goes on from the last word heard.
    await page.getByRole("button", { name: "Pausa" }).click();
    await expect(status(page)).toHaveText("En pausa");
    const atPause = (await spoken(page)).length;
    await page.waitForTimeout(500);
    expect((await spoken(page)).length).toBe(atPause);
    await page.getByRole("button", { name: "Reanudar" }).click();
    const resumed = (await spoken(page)).at(-1)!.text;
    expect("Segunda frase con más palabras para leer.".endsWith(resumed)).toBe(true);
    expect(resumed.length).toBeGreaterThan(0);

    // Stop: back to the editable text, from the start.
    await page.getByRole("button", { name: "Detener" }).click();
    await expect(textArea(page)).toHaveValue(SAMPLE);
    await expect(page.getByText("Frase 1 de 3")).toBeVisible();

    // A full reading ends by itself.
    await page.evaluate(() => ((window as unknown as { __tts: { wordMs: number } }).__tts.wordMs = 10));
    await page.getByRole("button", { name: "Reproducir" }).click();
    await expect(status(page)).toHaveText("Lectura terminada", { timeout: 5000 });
    expect((await spoken(page)).slice(-3).map((s) => s.text)).toEqual(["Primera frase del texto.", "Segunda frase con más palabras para leer.", "Tercera y última frase."]);
  });

  test("next and previous sentence, speed and voice changes apply at once and are remembered", async ({ page }) => {
    await fakeSpeech(page);
    await page.goto("/es/leer-texto-en-voz-alta", { waitUntil: "networkidle" });
    await page.evaluate(() => ((window as unknown as { __tts: { wordMs: number } }).__tts.wordMs = 2000));
    await textArea(page).fill(SAMPLE);
    await page.getByRole("button", { name: "Reproducir" }).click();
    await page.getByRole("button", { name: "Frase siguiente" }).click();
    await expect(page.getByTestId("tts-current")).toHaveText("Segunda frase con más palabras para leer.");
    await page.getByRole("button", { name: "Frase siguiente" }).click();
    await expect(page.getByTestId("tts-current")).toHaveText("Tercera y última frase.");
    await expect(page.getByRole("button", { name: "Frase siguiente" })).toBeDisabled();
    await page.getByRole("button", { name: "Frase anterior" }).click();
    await expect(page.getByTestId("tts-current")).toHaveText("Segunda frase con más palabras para leer.");

    // Speed: the current sentence starts again at the new rate.
    await page.getByLabel("Velocidad").selectOption("1.5");
    await expect.poll(async () => (await spoken(page)).at(-1)).toEqual({ text: "Segunda frase con más palabras para leer.", rate: 1.5, voice: "local-es", lang: "es-ES" });
    await page.getByLabel("Voz", { exact: true }).selectOption("google-es");
    await expect.poll(async () => (await spoken(page)).at(-1)?.voice).toBe("google-es");

    // Space bar pauses and resumes when the focus is not on a control.
    await page.locator("h1").click();
    await page.keyboard.press("Space");
    await expect(status(page)).toHaveText("En pausa");
    await page.keyboard.press("Space");
    await expect(status(page)).toHaveText("Leyendo");

    // Both choices survive a reload.
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByLabel("Velocidad")).toHaveValue("1.5");
    await textArea(page).fill(SAMPLE);
    await expect(page.getByLabel("Voz", { exact: true })).toHaveValue("google-es");
  });

  test("English text picks an English voice; no voices or no speech support say so", async ({ page, context }) => {
    await fakeSpeech(page);
    await page.goto("/es/leer-texto-en-voz-alta", { waitUntil: "networkidle" });
    await textArea(page).fill("The cat is on the table and the dog is in the garden.");
    await expect(page.getByLabel("Voz", { exact: true })).toHaveValue("local-en");
    await page.getByRole("button", { name: "Reproducir" }).click();
    expect((await spoken(page)).at(-1)).toMatchObject({ voice: "local-en", lang: "en_US" });
    await page.getByRole("button", { name: "Detener" }).click();
    await page.getByLabel("Idioma", { exact: true }).selectOption("fr");
    await expect(page.getByText(/No encontramos voces en Français en tu dispositivo/)).toBeVisible();

    const other = await context.newPage();
    await fakeSpeech(other, { supported: false });
    await other.goto("/es/leer-texto-en-voz-alta", { waitUntil: "networkidle" });
    await other.getByRole("textbox", { name: "Texto para leer" }).fill(SAMPLE);
    await expect(other.locator("main [role=alert]")).toContainText("Tu navegador no puede leer en voz alta");
    await expect(other.getByRole("button", { name: "Reproducir" })).toBeDisabled();
  });
});
