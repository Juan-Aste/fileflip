// Spreadsheet converter: outputs are checked without SheetJS (the XML inside
// the XLSX/ODS with fflate, CSV as text). Everything runs in the browser.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { expect, fileOf, openWithFiles, runTool, test } from "./support";

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "the spreadsheet converter must not call the server").toEqual([]);
});

const choose = (page: import("@playwright/test").Page, label: string) => page.locator("label").filter({ hasText: label }).first().click();

test.describe("tool: spreadsheet-converter", () => {
  test("a two-sheet workbook becomes one CSV per sheet for Excel in Spanish", async ({ page }) => {
    await openWithFiles(page, "/es/convertir-hoja-de-calculo", ["workbook.xlsx"]);
    await choose(page, "CSV");
    await choose(page, "Punto y coma");
    await page.getByRole("button", { name: "Convertir", exact: true }).click();
    await expect(page.getByRole("button", { name: /ZIP/ })).toBeVisible({ timeout: 45_000 });
    const links = page.locator("main a[download]");
    expect(await links.evaluateAll((all) => all.map((a) => a.getAttribute("download")))).toEqual(["workbook-Ventas.csv", "workbook-Notas.csv"]);
    const [download] = await Promise.all([page.waitForEvent("download"), links.first().click()]);
    const csv = new TextDecoder("utf-8", { ignoreBOM: true }).decode(readFileSync((await download.path())!));
    expect(csv).toBe("﻿producto;cantidad;precio;total;fecha\r\nCafé;2;3,25;6,5;2024-03-15\r\n北京 té;1;9,5;9,5;2024-12-01\r\ncódigo;007;0,1;16;\r\n");
  });

  test("an Excel CSV (Windows-1252, decimal comma) becomes an XLSX with numbers, and an ODS keeps formulas", async ({ page }) => {
    await openWithFiles(page, "/en/spreadsheet-converter", ["table-excel.csv"]);
    const xlsx = fileOf(await runTool(page, "Convert"));
    expect(xlsx.name).toBe("table-excel.xlsx");
    const files = unzipSync(new Uint8Array(xlsx.buf));
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]!);
    expect(sheet).toMatch(/<v>3\.25<\/v>/);
    // Text may be stored inline or in the shared strings table.
    expect(sheet + strFromU8(files["xl/sharedStrings.xml"] ?? new Uint8Array())).toContain("Cañón");

    await page.getByRole("button", { name: /Start over/ }).click();
    await page.locator('input[type="file"]').first().setInputFiles(join(__dirname, "..", "fixtures", "workbook.ods"));
    await page.waitForFunction(() => !document.body.innerText.includes("Detect"), null, { timeout: 15_000 });
    await choose(page, "Excel (XLSX)");
    const out = fileOf(await runTool(page, "Convert"));
    const book = unzipSync(new Uint8Array(out.buf));
    expect(strFromU8(book["xl/workbook.xml"]!)).toMatch(/name="Ventas"[\s\S]*name="Notas"/);
    expect(strFromU8(book["xl/worksheets/sheet1.xml"]!)).toContain("<f>SUM(D2:D3)</f>");
  });

  test("damaged and binary files fail one by one", async ({ page }) => {
    await page.goto("/en/spreadsheet-converter", { waitUntil: "networkidle" });
    await page.locator('input[type="file"]').first().setInputFiles([
      { name: "cut.xlsx", mimeType: "application/octet-stream", buffer: readFileSync(join(__dirname, "..", "fixtures", "workbook.xlsx")).subarray(0, 2000) },
      { name: "photo.csv", mimeType: "text/csv", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 1, 2]) },
      { name: "ok.tsv", mimeType: "text/tab-separated-values", buffer: Buffer.from("a\tb\n1\t2\n") },
    ]);
    await page.getByRole("button", { name: "Convert", exact: true }).click();
    const main = page.locator("main");
    await expect(main.locator("a[download]")).toHaveCount(1, { timeout: 45_000 });
    await expect(main.getByText("This file is damaged or incomplete.")).toHaveCount(2);
  });
});
