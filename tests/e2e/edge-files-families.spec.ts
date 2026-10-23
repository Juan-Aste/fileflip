// Hard real-world files in the remaining tool families (6E.3 in PLAN.md):
// data, documents, OCR, archives, ebooks, audio, video, 3D, CAD and
// utilities, with the fixtures that apply (empty files, lying extensions,
// odd names, the size limit). Each must give a correct result or a clear
// message, never hang, and keep a sensible download name.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, fileOf, fixturePath, readJson, readText, runTool, test, toolAlert, unzipEntries, waitForResult } from "./support";

const edge = (name: string) => fixturePath(join("edge", name));
type Pick = string | { name: string; mimeType: string; buffer: Buffer };
/** A fixture renamed the way users' files are named. */
const renamed = (fixture: string, name: string): Pick => ({ name, mimeType: "", buffer: readFileSync(fixturePath(fixture)) });

test.describe.configure({ mode: "serial" });
test.beforeAll(() => {
  test.setTimeout(120_000);
  if (!existsSync(edge("server-limit-plus-1kb.md"))) {
    execFileSync(process.execPath, [join(__dirname, "..", "..", "scripts", "fixtures", "edge.mjs")], { stdio: "ignore" });
  }
});
test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "browser tools must not call the server").toEqual([]);
});

async function open(page: Page, path: string, files: Pick[]) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles(files as Parameters<Page["setInputFiles"]>[1]);
  await page.waitForFunction(() => !document.body.innerText.includes("Detectando"), null, { timeout: 30_000 });
}

test.describe("empty files are refused when picked (B-20)", () => {
  for (const [path, file, action] of [
    ["/es/csv-a-json", "empty.csv", "Convertir a JSON"],
    ["/es/formatear-json", "empty.json", "Formatear JSON"],
    ["/es/extraer-zip", "empty.zip", "Extraer archivos"],
    ["/es/convertir-epub", "empty.epub", "Convertir libro"],
    ["/es/convertir-audio", "empty.mp3", "Convertir audio"],
    ["/es/convertir-video", "empty.mp4", "Convertir video"],
    ["/es/convertir-modelo-3d", "empty.stl", "Convertir modelo"],
    ["/es/convertir-dxf", "empty.dxf", "Convertir plano"],
    ["/es/imagen-a-texto", "empty.png", "Extraer texto"],
    ["/es/convertir-hoja-de-calculo", "empty.csv", "Convertir"],
  ] as const) {
    test(`${path} ← ${file}`, async ({ page }) => {
      await open(page, path, [edge(file)]);
      await expect(toolAlert(page)).toHaveText(`${file}: El archivo está vacío.`);
      await expect(page.getByRole("button", { name: action, exact: true })).toHaveCount(0);
    });
  }

  test("home converter says the file is empty, not that the format is unknown", async ({ page }) => {
    await open(page, "/es", [edge("empty.docx")]);
    await expect(page.locator("section li").filter({ hasText: "empty.docx" })).toContainText("El archivo está vacío.");
  });

  test("hash of an empty file is still computed (empty files are valid there)", async ({ page }) => {
    await open(page, "/es/generador-hash", [edge("empty.txt")]);
    const out = fileOf(await runTool(page, "Calcular hash"));
    expect(readText(out.buf)).toContain("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  test("ZIP keeps an empty file and names with accents and emoji", async ({ page }) => {
    await open(page, "/es/crear-zip", [edge("Fotografía de año nuevo — ñandú.jpg"), edge("🎉 fiesta 😀.png"), edge("empty.txt")]);
    const out = fileOf(await runTool(page, "Crear archivo"));
    const entries = unzipEntries(out.buf);
    expect(entries.map((e) => e.name.normalize("NFC")).sort()).toEqual(
      ["Fotografía de año nuevo — ñandú.jpg", "empty.txt", "🎉 fiesta 😀.png"].map((n) => n.normalize("NFC")).sort(),
    );
    expect(entries.find((e) => e.name === "empty.txt")!.data).toHaveLength(0);
  });
});

test.describe("names with accents and emoji are kept", () => {
  test.describe.configure({ timeout: 120_000 });

  test("CSV → JSON", async ({ page }) => {
    await open(page, "/es/csv-a-json", [renamed("table.csv", "Ventas año 2026 📊.csv")]);
    const out = fileOf(await runTool(page, "Convertir a JSON"));
    expect(out.name.normalize("NFC")).toBe("Ventas año 2026 📊.json".normalize("NFC"));
    expect(readJson(out.buf)).toHaveLength(3);
  });

  test("audio WAV → MP3", async ({ page }) => {
    await open(page, "/es/convertir-audio", [renamed("audio.wav", "Grabación — ñandú 🎵.wav")]);
    const out = fileOf(await runTool(page, "Convertir audio"));
    expect(out.name.normalize("NFC")).toBe("Grabación — ñandú 🎵.mp3".normalize("NFC"));
    expect(out.buf.subarray(0, 3).toString("latin1")).toMatch(/^(ID3|\xff[\xe0-\xff])/);
  });

  test("DXF → SVG", async ({ page }) => {
    await open(page, "/es/convertir-dxf", [renamed("plan.dxf", "Plano cocina — 1ª planta.dxf")]);
    const out = fileOf(await runTool(page, "Convertir plano"));
    expect(out.name.normalize("NFC")).toBe("Plano cocina — 1ª planta.svg".normalize("NFC"));
    expect(readText(out.buf)).toContain("<svg");
  });

  test("EPUB → HTML", async ({ page }) => {
    await open(page, "/es/convertir-epub", [renamed("book.epub", "Cuentos de año nuevo 📚.epub")]);
    const out = fileOf(await runTool(page, "Convertir libro"));
    expect(out.name.normalize("NFC")).toBe("Cuentos de año nuevo 📚.html".normalize("NFC"));
  });
});

test.describe("extensions that lie", () => {
  test.describe.configure({ timeout: 120_000 });

  test("MP3 named .wav → converted by its content", async ({ page }) => {
    await open(page, "/es/convertir-audio", [edge("mp3-named.wav")]);
    await page.locator("label").filter({ hasText: "WAV (sin pérdida)" }).first().click();
    const out = fileOf(await runTool(page, "Convertir audio"));
    expect(out.name).toBe("mp3-named.wav");
    expect(out.buf.subarray(0, 4).toString()).toBe("RIFF");
  });

  test("WebM named .mp4 → MP4 by its content", async ({ page }) => {
    await open(page, "/es/convertir-video", [edge("webm-named.mp4")]);
    const out = fileOf(await runTool(page, "Convertir video"));
    expect(out.name).toBe("webm-named.mp4");
    expect(out.buf.subarray(4, 8).toString()).toBe("ftyp");
  });

  test("plain ZIP named .epub → clear message", async ({ page }) => {
    await open(page, "/es/convertir-epub", [edge("zip-named.epub")]);
    expect((await runTool(page, "Convertir libro")).error).toBe("El archivo está dañado o incompleto. Prueba con otra copia.");
  });

  test("PDF named .docx (home) → images named after the file, not the wrong extension (B-21)", async ({ page }) => {
    await open(page, "/es", [edge("pdf-named.docx")]);
    const row = page.locator("section li").first();
    await expect(row).toContainText("PDF");
    await page.locator('input[name="target"][value="jpg"]').check({ force: true });
    await page.getByRole("button", { name: "Convertir", exact: true }).click();
    const out = fileOf(await waitForResult(page, row.locator("a[download]"), row.locator(".text-danger")));
    expect(out.name).toBe("pdf-named-jpg.zip");
    expect(unzipEntries(out.buf).map((e) => e.name)).toEqual(["pdf-named-1.jpg", "pdf-named-2.jpg", "pdf-named-3.jpg"]);
  });
});

test.describe("size limit and protected files", () => {
  test("Markdown over the server limit → refused before uploading", async ({ page }) => {
    await open(page, "/es/markdown-a-pdf", [edge("server-limit-plus-1kb.md")]);
    await expect(toolAlert(page)).toHaveText("server-limit-plus-1kb.md: El archivo es demasiado grande.");
  });

  test("Markdown over the in-page limit → refused", async ({ page }) => {
    await open(page, "/es/markdown-a-html", [edge("server-limit-minus-1kb.md")]);
    await expect(toolAlert(page)).toHaveText("server-limit-minus-1kb.md: El archivo es demasiado grande.");
  });

  test("password PDF in OCR → says to remove the password first", async ({ page }) => {
    await open(page, "/es/ocr-pdf", [edge("password-abre123.pdf")]);
    expect((await runTool(page, "Reconocer texto")).error).toBe(
      "Este PDF tiene contraseña de apertura. Quítala primero con «Quitar contraseña de PDF» y vuelve a intentarlo.",
    );
  });
});
