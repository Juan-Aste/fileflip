// Data tools (JSON ↔ CSV/TSV) run like a user would on /es: pick a fixture or
// paste text, download the result and read it back with independent readers.
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, fileOf, fixturePath, readCsv, readJson, runTool, test, toolAlert, waitForResult } from "./support";

const open = async (page: Page, path: string, files: string[] = []) => {
  await page.goto(path, { waitUntil: "networkidle" });
  if (files.length) await page.locator('input[type="file"]').first().setInputFiles(files.map(fixturePath));
};
const choose = (page: Page, label: string) => page.locator("label").filter({ hasText: label }).first().click();

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "data tools must not call the server").toEqual([]);
});

test.describe("tool: json-to-csv", () => {
  test("nested JSON file → CSV with dotted columns and a BOM", async ({ page }) => {
    await open(page, "/es/json-a-csv", ["data.json"]);
    const out = fileOf(await runTool(page, "Convertir a CSV"));
    expect(out.name).toBe("data.csv");
    expect([...out.buf.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const rows = readCsv(out.buf).filter((r) => r.some(Boolean));
    expect(rows[0]).toEqual(["id", "name", "active", "score", "address.city", "address.zip", "tags.0", "tags.1", "note"]);
    expect(rows[1]).toEqual(["1", "Ana Pérez", "true", "9.5", "Lima", "007", "a", "b", ""]);
    expect(rows[2]![1]).toBe('Zoë "Z", Jr.');
    expect(rows[3]).toEqual(["3", "李雷", "true", "7", "北京", "100000", "", "", "line 1\nline 2"]);
    // The preview shows the same text.
    await expect(page.getByRole("textbox", { name: "Vista previa" })).toHaveValue(/^id,name,active/);
  });

  test("pasted JSON → TSV", async ({ page }) => {
    await open(page, "/es/json-a-csv");
    await page.getByRole("textbox", { name: "O pega tu JSON" }).fill('[{"a": 1, "b": "x\\ty"}, {"a": 2}]');
    await choose(page, "Tabulación (TSV)");
    const out = fileOf(await runTool(page, "Convertir a CSV"));
    expect(out.name).toBe("data.tsv");
    expect(readCsv(out.buf, "\t").filter((r) => r.some(Boolean))).toEqual([["a", "b"], ["1", "x\ty"], ["2", ""]]);
  });

  test("broken JSON shows an error", async ({ page }) => {
    await open(page, "/es/json-a-csv", ["corrupt/broken.json"]);
    const result = await runTool(page, "Convertir a CSV");
    expect(result.error).toContain("No pudimos leer el contenido");
    await expect(toolAlert(page)).toBeVisible();
  });
});

test.describe("tool: csv-to-json", () => {
  test("Excel CSV (semicolons, Windows-1252) → typed JSON", async ({ page }) => {
    await open(page, "/es/csv-a-json", ["table-excel.csv"]);
    const out = fileOf(await runTool(page, "Convertir a JSON"));
    expect(out.name).toBe("table-excel.json");
    expect(readJson(out.buf)).toEqual([
      { nombre: "Cañón", cantidad: 2, precio: "3,25" },
      { nombre: "Açaí", cantidad: 1, precio: "9,50" },
    ]);
  });

  test("TSV and CSV in one batch → one JSON each, plus the ZIP option", async ({ page }) => {
    await open(page, "/es/csv-a-json", ["table.tsv", "table.csv"]);
    await page.getByRole("button", { name: "Convertir a JSON", exact: true }).click();
    const links = page.locator("main a[download]");
    await expect(links).toHaveCount(2);
    await expect(page.getByRole("button", { name: /ZIP/ })).toBeVisible();
    const tsv = fileOf(await waitForResult(page, links.nth(0), toolAlert(page)));
    expect(readJson(tsv.buf)).toEqual([{ name: "alpha", qty: 1 }, { name: "beta", qty: 2 }]);
    const csv = fileOf(await waitForResult(page, links.nth(1), toolAlert(page)));
    expect(readJson(csv.buf)).toEqual([
      { name: "alpha", qty: 1, price: 9.5 },
      { name: "beta, with comma", qty: 2, price: 3.25 },
      { name: "gamma", qty: 3, price: 0 },
    ]);
  });

  test("round trip: the CSV made from data.json reads back as the same records", async ({ page }) => {
    await open(page, "/es/json-a-csv", ["data.json"]);
    const csv = fileOf(await runTool(page, "Convertir a CSV"));
    await open(page, "/es/csv-a-json");
    await page.getByRole("textbox", { name: "O pega tu CSV" }).fill(csv.buf.toString("utf8").replace(/^﻿/, ""));
    const back = readJson(fileOf(await runTool(page, "Convertir a JSON")).buf) as Record<string, unknown>[];
    const original = JSON.parse(readFileSync(fixturePath("data.json"), "utf8")) as Record<string, unknown>[];
    // A key missing from a record comes back as null (its cell is empty) and an
    // empty list has no cell of its own: compare what a table can hold.
    expect(back[0]).toEqual({ ...original[0], note: null });
    expect(back[1]).toEqual({ ...original[1], note: null });
    // CSV has no types: a numeric-looking string ("100000") reads back as a number.
    expect(back[2]).toEqual({ ...original[2], address: { city: "北京", zip: 100000 }, tags: undefined });
  });

  test("broken quoting shows an error", async ({ page }) => {
    await open(page, "/es/csv-a-json", ["corrupt/bad-quotes.csv"]);
    expect((await runTool(page, "Convertir a JSON")).error).toContain("No pudimos leer el contenido");
  });
});
