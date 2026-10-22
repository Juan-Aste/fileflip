// Password generator and word counter: outputs read back in the test.
import { readFileSync } from "node:fs";
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
