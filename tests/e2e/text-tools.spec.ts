// Password generator and word counter: outputs read back in the test.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, fileOf, fixturePath, readText, runTool, test } from "./support";

const choose = (page: Page, label: string) => page.locator("label").filter({ hasText: label }).first().click();

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "text tools must not call the server").toEqual([]);
});

test.describe("tool: password-generator", () => {
  test("a batch of unique passwords with every chosen character type", async ({ page }) => {
    await page.goto("/es/generador-de-contrasenas", { waitUntil: "networkidle" });
    await expect(page.getByText("Fuerte: 131 bits de entropía.")).toBeVisible();
    await page.getByRole("spinbutton", { name: /Cantidad/ }).fill("50");
    const out = fileOf(await runTool(page, "Generar contraseñas"));
    expect(out.name).toBe("passwords.txt");
    const passwords = readText(out.buf).trim().split("\n");
    expect(passwords).toHaveLength(50);
    expect(new Set(passwords).size).toBe(50);
    for (const p of passwords) {
      expect(p).toHaveLength(20);
      for (const set of [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/]) expect(p).toMatch(set);
    }
  });

  test("digits only, no ambiguous characters, with a weak warning", async ({ page }) => {
    await page.goto("/en/password-generator", { waitUntil: "networkidle" });
    for (const label of ["Upper case (A-Z)", "Lower case (a-z)", "Symbols (!#$%…)", "Avoid look-alike characters"]) await choose(page, label);
    await expect(page.getByText(/^Weak: \d+ bits of entropy/)).toBeVisible();
    const out = fileOf(await runTool(page, "Generate passwords"));
    expect(readText(out.buf)).toMatch(/^[2-9]{20}\n$/);
  });

  test("the action is disabled without character types", async ({ page }) => {
    await page.goto("/en/password-generator", { waitUntil: "networkidle" });
    for (const label of ["Upper case (A-Z)", "Lower case (a-z)", "Numbers (0-9)", "Symbols (!#$%…)"]) await choose(page, label);
    await expect(page.getByText("Choose at least one character type.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate passwords", exact: true })).toBeDisabled();
  });
});

test.describe("tool: word-counter", () => {
  const figure = (page: Page, label: string) => page.locator("dl > div").filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator("dd");

  test("live counts, case changes and download", async ({ page }) => {
    await page.goto("/es/contador-de-palabras", { waitUntil: "networkidle" });
    const box = page.getByRole("textbox", { name: "Escribe o pega tu texto" });
    await box.fill("Hola, ¿cómo estás? Bien 👍🏽.\n\nSegundo párrafo: correo y 3,5 kg.");
    await expect(figure(page, "Palabras")).toHaveText("10");
    await expect(figure(page, "Caracteres")).toHaveText("61");
    await expect(figure(page, "Sin espacios")).toHaveText("50");
    await expect(figure(page, "Oraciones")).toHaveText("3");
    await expect(figure(page, "Párrafos")).toHaveText("2");
    await expect(figure(page, "Líneas")).toHaveText("3");
    await page.getByRole("button", { name: "MAYÚSCULAS" }).click();
    await expect(box).toHaveValue("HOLA, ¿CÓMO ESTÁS? BIEN 👍🏽.\n\nSEGUNDO PÁRRAFO: CORREO Y 3,5 KG.");
    await page.getByRole("button", { name: "Tipo oración" }).click();
    await expect(box).toHaveValue("Hola, ¿cómo estás? Bien 👍🏽.\n\nSegundo párrafo: correo y 3,5 kg.");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar .txt" }).click()]);
    expect(readFileSync((await download.path())!, "utf8")).toBe("Hola, ¿cómo estás? Bien 👍🏽.\n\nSegundo párrafo: correo y 3,5 kg.");
  });

  test("opens a text file and counts Chinese", async ({ page }) => {
    await page.goto("/zh/word-counter", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').setInputFiles(fixturePath("text.txt"));
    const box = page.getByRole("textbox", { name: "输入或粘贴文本" });
    await expect(box).toHaveValue(readFileSync(fixturePath("text.txt"), "utf8"));
    await expect(figure(page, "行数")).toHaveText("4");
    await box.fill("我们今天去北京。天气很好！");
    await expect(figure(page, "字符")).toHaveText("13");
    await expect(figure(page, "句子")).toHaveText("2");
  });
});

test.describe("tool: case-converter", () => {
  test("title case by language, alternating, undo and download @xb", async ({ page }) => {
    await page.goto("/es/convertir-mayusculas-minusculas", { waitUntil: "networkidle" });
    const box = page.getByRole("textbox", { name: "Escribe o pega tu texto" });
    await box.fill("EL SEÑOR DE LOS ANILLOS: la comunidad del anillo");
    await page.getByRole("button", { name: "Tipo Título" }).click();
    await expect(box).toHaveValue("El Señor de los Anillos: La Comunidad del Anillo");
    await page.getByRole("button", { name: "Deshacer" }).click();
    await expect(box).toHaveValue("EL SEÑOR DE LOS ANILLOS: la comunidad del anillo");
    await page.getByLabel("Idioma del texto").selectOption("tr");
    await box.fill("istanbul ve izmir");
    await page.getByRole("button", { name: "MAYÚSCULAS" }).click();
    await expect(box).toHaveValue("İSTANBUL VE İZMİR");
    await page.getByRole("button", { name: "aLtErNaDo" }).click();
    await expect(box).toHaveValue("iStAnBuL vE iZmİr");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar .txt" }).click()]);
    expect(readFileSync((await download.path())!, "utf8")).toBe("iStAnBuL vE iZmİr");
    await page.getByRole("link", { name: "Contar palabras" }).click();
    await expect(page).toHaveURL(/\/es\/contador-de-palabras$/);
  });

  test("English title case keeps small words, a file is opened", async ({ page }) => {
    await page.goto("/en/case-converter", { waitUntil: "networkidle" });
    const box = page.getByRole("textbox", { name: "Type or paste your text" });
    await box.fill("the lord of the rings");
    await page.getByRole("button", { name: "Title Case" }).click();
    await expect(box).toHaveValue("The Lord of the Rings");
    await page.getByLabel(/keep short articles/).uncheck();
    await page.getByRole("button", { name: "Title Case" }).click();
    await expect(box).toHaveValue("The Lord Of The Rings");
    await page.locator('input[type="file"]').setInputFiles(fixturePath("text.txt"));
    await expect(box).toHaveValue(readFileSync(fixturePath("text.txt"), "utf8"));
  });
});

test.describe("tool: compare-text", () => {
  const original = "Contrato de alquiler\nPrecio: 1.200 euros al mes\nDuración: 12 meses\nFianza: un mes\n";
  const revised = "Contrato de alquiler\nPrecio: 1.350 euros al mes\nDuración: 12 meses\nMascotas: permitidas\n";

  test("line differences with changed words, and a .diff that patch applies @xb", async ({ page }) => {
    await page.goto("/es/comparar-textos", { waitUntil: "networkidle" });
    await page.getByRole("textbox", { name: "Texto original" }).fill(original);
    await page.getByRole("textbox", { name: "Texto nuevo" }).fill(revised);
    await page.getByRole("button", { name: "Comparar", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("2 líneas cambiadas, ninguna agregada y ninguna eliminada.");
    const result = page.getByRole("list", { name: "Diferencias" });
    await expect(result.locator("del")).toHaveText(["eliminado: 200", "eliminado: Fianza", "eliminado: un mes"]);
    await expect(result.locator("ins")).toHaveText(["agregado: 350", "agregado: Mascotas", "agregado: permitidas"]);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar .diff" }).click()]);
    expect(download.suggestedFilename()).toBe("changes.diff");
    // The patch, applied to the original with patch(1), gives the new text.
    const dir = mkdtempSync(join(tmpdir(), "compare-"));
    writeFileSync(join(dir, "original.txt"), original);
    execFileSync("patch", ["-s", join(dir, "original.txt"), (await download.path())!]);
    expect(readFileSync(join(dir, "original.txt"), "utf8")).toBe(revised);
  });

  test("by word, ignoring case and spaces", async ({ page }) => {
    await page.goto("/en/compare-text", { waitUntil: "networkidle" });
    await page.getByRole("textbox", { name: "Original text" }).fill("The quick brown fox\njumps over the lazy dog.");
    await page.getByRole("textbox", { name: "New text" }).fill("The quick red fox jumps\nover the lazy dog.");
    await choose(page, "Words");
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("1 word added and 1 removed.");
    await expect(page.locator("del")).toHaveText(["removed: brown"]);
    await choose(page, "Lines");
    await page.getByRole("textbox", { name: "New text" }).fill("THE QUICK   BROWN FOX\njumps over the lazy dog.  ");
    await choose(page, "Ignore upper and lower case");
    await choose(page, "Ignore extra spaces");
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("The texts are identical.");
  });
});

test.describe("tool: remove-duplicate-lines", () => {
  test("removes duplicates and empty lines, sorts, and downloads @xb", async ({ page }) => {
    await page.goto("/es/quitar-lineas-duplicadas", { waitUntil: "networkidle" });
    await page.getByRole("textbox", { name: "Escribe o pega tu texto" }).fill("pera\n  manzana \n\nPera\nmanzana\nñandú\nárbol\nitem 10\nitem 2\n");
    const result = page.getByRole("textbox", { name: "Resultado" });
    await expect(result).toHaveValue("pera\nmanzana\nPera\nñandú\nárbol\nitem 10\nitem 2\n");
    await expect(page.getByRole("status")).toHaveText("9 líneas → 7 líneas (1 duplicada quitada, 1 vacía).");
    await choose(page, "No distinguir mayúsculas de minúsculas");
    await choose(page, "A → Z");
    await expect(result).toHaveValue("árbol\nitem 2\nitem 10\nmanzana\nñandú\npera\n");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar .txt" }).click()]);
    expect(download.suggestedFilename()).toBe("lines.txt");
    expect(readFileSync((await download.path())!, "utf8")).toBe("árbol\nitem 2\nitem 10\nmanzana\nñandú\npera\n");
  });
});

test.describe("tool: lorem-ipsum", () => {
  test("paragraphs, words and HTML output", async ({ page }) => {
    await page.goto("/en/lorem-ipsum-generator", { waitUntil: "networkidle" });
    const result = page.getByRole("textbox", { name: "Result" });
    await expect(result).toHaveValue("");
    await page.getByRole("button", { name: "Generate text" }).click();
    const paragraphs = (await result.inputValue()).trim().split("\n\n");
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toMatch(/^Lorem ipsum dolor sit amet, consectetur adipiscing elit [a-z]/);
    await choose(page, "Words");
    await page.getByRole("spinbutton").fill("40");
    await choose(page, "As HTML paragraphs (p tags)");
    await page.getByRole("button", { name: "Generate another" }).click();
    const html = await result.inputValue();
    expect(html).toMatch(/^<p>Lorem ipsum [^<]+\.<\/p>\n$/);
    expect(html.replace(/<\/?p>/g, "").trim().split(/\s+/)).toHaveLength(40);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download .html" }).click()]);
    expect(download.suggestedFilename()).toBe("lorem-ipsum.html");
    expect(readFileSync((await download.path())!, "utf8")).toBe(html);
  });
});
