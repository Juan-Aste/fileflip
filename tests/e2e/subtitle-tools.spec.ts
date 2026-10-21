// Subtitle tools run like a user would: pick fixtures, convert or retime, and
// read the downloads back with readers that are not the app's code: the
// browser's own WebVTT parser (a <track> element) and small regex readers.
import type { Page } from "@playwright/test";
import { expect, fileOf, fixturePath, readText, runTool, test, toolAlert, waitForResult } from "./support";

const open = async (page: Page, path: string, files: string[] = []) => {
  await page.goto(path, { waitUntil: "networkidle" });
  if (files.length) await page.locator('input[type="file"]').first().setInputFiles(files.map(fixturePath));
};
const choose = (page: Page, label: string) => page.locator("label").filter({ hasText: label }).first().click();

/** Cues as Chromium's WebVTT parser reads them (seconds, text with tags). */
async function browserVttCues(page: Page, vtt: string) {
  return page.evaluate(async (text) => {
    const video = document.createElement("video");
    const track = document.createElement("track");
    track.src = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
    track.default = true;
    video.append(track);
    document.body.append(video);
    track.track.mode = "hidden";
    await new Promise<void>((resolve, reject) => {
      track.addEventListener("load", () => resolve());
      track.addEventListener("error", () => reject(new Error("track failed to load")));
    });
    const cues = [...(track.track.cues ?? [])] as VTTCue[];
    video.remove();
    return cues.map((c) => ({ start: c.startTime, end: c.endTime, text: c.text }));
  }, vtt);
}

/** SRT blocks: number, times in ms and text. */
function readSrt(text: string) {
  return text
    .trim()
    .split(/\r?\n\r?\n/)
    .map((block) => {
      const [id, timing, ...lines] = block.split(/\r?\n/);
      const m = /^(\d\d):(\d\d):(\d\d),(\d{3}) --> (\d\d):(\d\d):(\d\d),(\d{3})$/.exec(timing!)!;
      const ms = (i: number) => ((Number(m[i]) * 60 + Number(m[i + 1])) * 60 + Number(m[i + 2])) * 1000 + Number(m[i + 3]);
      return { id: Number(id), start: ms(1), end: ms(5), text: lines.join("\n") };
    });
}

const dialogues = (text: string) => text.split(/\r?\n/).filter((line) => line.startsWith("Dialogue:"));

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "subtitle tools must not call the server").toEqual([]);
});

test.describe("tool: subtitle-converter", () => {
  test("SRT and ASS → WebVTT that the browser's own parser reads", async ({ page }) => {
    await open(page, "/es/convertir-subtitulos", ["subtitles.srt", "subtitles.ass"]);
    await page.getByRole("button", { name: "Convertir subtítulos", exact: true }).click();
    const links = page.locator("main a[download]");
    await expect(links).toHaveCount(2);
    await expect(page.getByText("3 subtítulos.", { exact: false })).toBeVisible();
    await expect(page.getByText(/Se quitaron colores, fuentes o posiciones/).first()).toBeVisible();

    const srt = fileOf(await waitForResult(page, links.nth(0), toolAlert(page)));
    expect(srt.name).toBe("subtitles.vtt");
    expect(await browserVttCues(page, readText(srt.buf))).toEqual([
      { start: 1, end: 3.5, text: "Hola, ¿cómo estás?\n<i>Ñandú en cursiva</i>" },
      { start: 4, end: 6.25, text: "Texto en rojo\nSecond line" },
      { start: 62.003, end: 65, text: "中文字幕 &amp; <b>negrita</b>" },
    ]);
    const ass = fileOf(await waitForResult(page, links.nth(1), toolAlert(page)));
    expect(await browserVttCues(page, readText(ass.buf))).toEqual([
      { start: 1, end: 3.5, text: "Hola, <i>mundo</i>\nSegunda línea" },
      { start: 4, end: 6.25, text: "Cartel, con comas" },
    ]);
  });

  test("Windows-1252 SRT → ASS in UTF-8, and VTT → SRT", async ({ page }) => {
    await open(page, "/en/subtitle-converter", ["subtitles-latin1.srt"]);
    await choose(page, "ASS (Advanced SubStation)");
    const out = fileOf(await runTool(page, "Convert subtitles"));
    expect(out.name).toBe("subtitles-latin1.ass");
    const text = readText(out.buf);
    expect(text).toContain("[V4+ Styles]");
    expect(dialogues(text)).toEqual([
      "Dialogue: 0,0:00:00.50,0:00:02.00,Default,,0,0,0,,Canción de cuna",
      "Dialogue: 0,0:00:02.50,0:00:04.00,Default,,0,0,0,,Açúcar y piñón",
    ]);

    await open(page, "/en/subtitle-converter", ["subtitles.vtt"]);
    await choose(page, "SRT");
    const srt = fileOf(await runTool(page, "Convert subtitles"));
    expect(srt.name).toBe("subtitles.srt");
    expect(readSrt(readText(srt.buf))).toEqual([
      { id: 1, start: 1000, end: 3500, text: "Hola & bienvenidos\n<i>segunda línea</i>" },
      { id: 2, start: 4000, end: 6000, text: "Árvore <3" },
    ]);
  });

  test("a file without cues fails with a clear error", async ({ page }) => {
    await open(page, "/es/convertir-subtitulos", ["corrupt/broken.srt"]);
    const result = await runTool(page, "Convertir subtítulos");
    expect(result.error).toContain("No pudimos leer el contenido");
  });
});

test.describe("tool: subtitle-sync", () => {
  test("shifting an SRT earlier drops what ends before zero and renumbers", async ({ page }) => {
    await open(page, "/es/sincronizar-subtitulos", ["subtitles.srt"]);
    const action = page.getByRole("button", { name: "Sincronizar subtítulos", exact: true });
    // Zero shift and an invalid value do nothing.
    await expect(action).toBeDisabled();
    const offset = page.getByRole("textbox", { name: "Mover los tiempos (segundos)" });
    await offset.fill("abc");
    await expect(page.getByText("Escribe un número de segundos")).toBeVisible();
    await expect(action).toBeDisabled();
    await offset.fill("-4");
    const out = fileOf(await runTool(page, "Sincronizar subtítulos"));
    expect(out.name).toBe("subtitles.srt");
    await expect(page.getByText(/Se quitó 1 línea que terminaba antes del inicio/)).toBeVisible();
    expect(readSrt(readText(out.buf))).toEqual([
      { id: 1, start: 0, end: 2250, text: '<font color="#ff0000">Texto en rojo</font>\nSecond line' },
      { id: 2, start: 58_003, end: 61_000, text: "中文字幕 & <b>negrita</b>" },
    ]);
  });

  test("ASS from 25 to 23.976 FPS keeps styles; pasted VTT shifted later keeps settings", async ({ page }) => {
    await open(page, "/en/subtitle-sync", ["subtitles.ass"]);
    await choose(page, "Change the frame rate (FPS)");
    await page.getByLabel("Subtitle FPS").selectOption("25");
    await page.getByLabel("Video FPS").selectOption("23.976");
    const out = fileOf(await runTool(page, "Sync subtitles"));
    expect(out.name).toBe("subtitles.ass");
    const text = readText(out.buf);
    expect(text).toContain("Style: Sign,Arial,30");
    expect(dialogues(text)).toEqual([
      "Dialogue: 0,0:00:01.04,0:00:03.65,Default,,0,0,0,,Hola, {\\i1}mundo{\\i0}\\NSegunda línea",
      "Dialogue: 0,0:00:04.17,0:00:06.52,Sign,,0,0,0,,{\\pos(100,50)\\c&H0000FF&}Cartel, con comas",
    ]);

    await page.goto("/en/subtitle-sync", { waitUntil: "networkidle" });
    await page.getByRole("textbox", { name: "Or paste your subtitles" }).fill("WEBVTT\n\n00:01.000 --> 00:02.000 line:0\nHi");
    await page.getByRole("textbox", { name: "Shift timings (seconds)" }).fill("1,5");
    const vtt = fileOf(await runTool(page, "Sync subtitles"));
    expect(vtt.name).toBe("subtitles.vtt");
    expect(readText(vtt.buf)).toBe("WEBVTT\n\n00:00:02.500 --> 00:00:03.500 line:0\nHi");
    expect(await browserVttCues(page, readText(vtt.buf))).toEqual([{ start: 2.5, end: 3.5, text: "Hi" }]);
  });
});
