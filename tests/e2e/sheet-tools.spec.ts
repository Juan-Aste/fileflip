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
  test("a two-sheet workbook becomes one CSV per sheet for Excel in Spanish", { tag: "@xb" }, async ({ page }) => {
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

// One page per searched conversion, on the same engine.
const unzipText = (buf: Buffer, path: string) => strFromU8(unzipSync(new Uint8Array(buf))[path]!);
const xlsxText = (buf: Buffer) => {
  const files = unzipSync(new Uint8Array(buf));
  return strFromU8(files["xl/worksheets/sheet1.xml"]!) + strFromU8(files["xl/sharedStrings.xml"] ?? new Uint8Array());
};

test.describe("tool: excel-to-csv", () => {
  test("picks one sheet of the workbook by name, with semicolons and BOM", { tag: "@xb" }, async ({ page }) => {
    await openWithFiles(page, "/es/excel-a-csv", ["workbook.xlsx"]);
    const select = page.getByLabel("Hoja", { exact: true });
    await expect(select).toHaveValue("Ventas", { timeout: 15_000 });
    await expect(select.locator("option")).toHaveText(["Ventas (4 filas)", "Notas (2 filas)", "Todas las hojas (un CSV por hoja)"]);
    await select.selectOption("Notas");
    await choose(page, "Punto y coma");
    const csv = fileOf(await runTool(page, "Convertir a CSV"));
    expect(csv.name).toBe("workbook-Notas.csv");
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(csv.buf)).toBe("﻿nota\r\nsegunda hoja ñ\r\n");
  });
});

test.describe("tool: csv-to-excel", () => {
  test("an Excel CSV with decimal commas becomes an XLSX with numbers", async ({ page }) => {
    await openWithFiles(page, "/en/csv-to-excel", ["table-excel.csv"]);
    const xlsx = fileOf(await runTool(page, "Convert to Excel"));
    expect(xlsx.name).toBe("table-excel.xlsx");
    const sheet = xlsxText(xlsx.buf);
    expect(sheet).toMatch(/<v>3\.25<\/v>/);
    expect(sheet).toContain("Cañón");
  });
});

test.describe("tool: xls-to-xlsx", () => {
  test("an Excel 97 file becomes an XLSX with its values", async ({ page }) => {
    await openWithFiles(page, "/pt/xls-para-xlsx", ["spreadsheet.xls"]);
    const xlsx = fileOf(await runTool(page, "Converter para XLSX"));
    expect(xlsx.name).toBe("spreadsheet.xlsx");
    const sheet = xlsxText(xlsx.buf);
    expect(sheet).toMatch(/<v>9\.5<\/v>/);
    expect(sheet).toContain("gamma");
  });
});

test.describe("tool: excel-to-ods", () => {
  test("an XLSX becomes an ODS with both sheets and its formulas", async ({ page }) => {
    await openWithFiles(page, "/fr/excel-en-ods", ["workbook.xlsx"]);
    const ods = fileOf(await runTool(page, "Convertir en ODS"));
    expect(ods.name).toBe("workbook.ods");
    expect(unzipText(ods.buf, "mimetype")).toBe("application/vnd.oasis.opendocument.spreadsheet");
    const content = unzipText(ods.buf, "content.xml");
    expect(content).toContain('table:name="Ventas"');
    expect(content).toContain('table:name="Notas"');
    expect(content).toMatch(/table:formula="of:=\[\.B2\]\*\[\.C2\]"/);
  });
});

test.describe("tool: ods-to-excel", () => {
  test("an ODS becomes an XLSX with both sheets and its formulas", async ({ page }) => {
    await openWithFiles(page, "/en/ods-to-excel", ["workbook.ods"]);
    const xlsx = fileOf(await runTool(page, "Convert to Excel"));
    expect(xlsx.name).toBe("workbook.xlsx");
    expect(unzipText(xlsx.buf, "xl/workbook.xml")).toMatch(/name="Ventas"[\s\S]*name="Notas"/);
    expect(unzipText(xlsx.buf, "xl/worksheets/sheet1.xml")).toContain("<f>SUM(D2:D3)</f>");
  });
});

test.describe("tool: excel-to-json", () => {
  test("rows as objects with real numbers and ISO dates; all sheets in one object", async ({ page }) => {
    await openWithFiles(page, "/es/excel-a-json", ["workbook.ods"]);
    await expect(page.getByLabel("Hoja", { exact: true })).toHaveValue("Ventas", { timeout: 15_000 });
    const first = fileOf(await runTool(page, "Convertir a JSON"));
    expect(first.name).toBe("workbook-Ventas.json");
    expect(JSON.parse(first.buf.toString("utf8"))[0]).toEqual({ producto: "Café", cantidad: 2, precio: 3.25, total: 6.5, fecha: "2024-03-15" });

    await page.getByRole("button", { name: /Empezar de nuevo/ }).click();
    await page.locator('input[type="file"]').first().setInputFiles(join(__dirname, "..", "fixtures", "workbook.ods"));
    const select = page.getByLabel("Hoja", { exact: true });
    await expect(select).toHaveValue("Ventas", { timeout: 15_000 });
    await select.selectOption({ label: "Todas las hojas (un objeto con una lista por hoja)" });
    const all = fileOf(await runTool(page, "Convertir a JSON"));
    expect(all.name).toBe("workbook.json");
    const data = JSON.parse(all.buf.toString("utf8"));
    expect(Object.keys(data)).toEqual(["Ventas", "Notas"]);
    expect(data.Notas).toEqual([{ nota: "segunda hoja ñ" }]);
  });
});

test.describe("tool: json-to-excel", () => {
  test("a list of objects becomes a table with one column per key", { tag: "@xb" }, async ({ page }) => {
    await openWithFiles(page, "/en/json-to-excel", ["data.json"]);
    const xlsx = fileOf(await runTool(page, "Convert to Excel"));
    expect(xlsx.name).toBe("data.xlsx");
    const sheet = xlsxText(xlsx.buf);
    for (const text of ["name", "address", "Ana Pérez", "São Paulo"]) expect(sheet).toContain(text);
    expect(sheet).toMatch(/<v>9\.5<\/v>/);
    // Booleans are typed cells.
    expect(sheet).toMatch(/t="b"[^>]*><v>1<\/v>/);
  });
});

test.describe("tool: pdf-to-excel", () => {
  test("a two-page statement: preview, one sheet per page with real numbers", { tag: "@xb" }, async ({ page }) => {
    await openWithFiles(page, "/es/pdf-a-excel", ["table-pages.pdf"]);
    await expect(page.getByText("Se detectaron 2 tablas.")).toBeVisible({ timeout: 20_000 });
    const preview = page.getByTestId("table-preview");
    await expect(preview).toContainText("Supermercado");
    // Numbers are shown as the browser's language writes them.
    await expect(preview).toContainText("1234,56");
    await page.getByLabel("Vista previa").selectOption({ index: 1 });
    await expect(preview).toContainText("Comisión");
    const xlsx = fileOf(await runTool(page, "Convertir a Excel"));
    expect(xlsx.name).toBe("table-pages.xlsx");
    expect(unzipText(xlsx.buf, "xl/workbook.xml")).toMatch(/name="Página 1"[\s\S]*name="Página 2"/);
    const sheet = xlsxText(xlsx.buf);
    expect(sheet).toMatch(/<v>84\.35<\/v>/);
    expect(sheet).toMatch(/<v>1234\.56<\/v>/);
    expect(sheet).toContain("Supermercado");
  });

  test("two tables on a page as one CSV each", async ({ page }) => {
    await openWithFiles(page, "/en/pdf-to-excel", ["table-two.pdf"]);
    await expect(page.getByText("2 tables found.")).toBeVisible({ timeout: 20_000 });
    await choose(page, "CSV");
    await choose(page, "One CSV per table");
    await page.getByRole("button", { name: "Convert to Excel", exact: true }).click();
    await expect(page.getByRole("button", { name: /ZIP/ })).toBeVisible({ timeout: 45_000 });
    const links = page.locator("main a[download]");
    expect(await links.evaluateAll((all) => all.map((a) => a.getAttribute("download")))).toEqual(["table-two-Table 1.csv", "table-two-Table 2.csv"]);
    const [download] = await Promise.all([page.waitForEvent("download"), links.nth(1).click()]);
    expect(readFileSync((await download.path())!, "utf8")).toBe("﻿Nombre,Área,Años\r\nAna Pérez,Ventas,4\r\nLuis Gómez,Logística,12\r\n");
  });

  test("a scan has no text: it points to OCR and cannot be converted", async ({ page }) => {
    await openWithFiles(page, "/en/pdf-to-excel", ["scan.pdf"]);
    await expect(page.getByText(/This PDF has no text/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: "Open “OCR scanned PDF”" })).toHaveAttribute("href", "/en/ocr-pdf");
    await expect(page.getByRole("button", { name: "Convert to Excel", exact: true })).toBeDisabled();
  });
});

test.describe("tool: merge-excel", () => {
  test("files as sheets of one workbook, or stacked with the header once and a source column", async ({ page }) => {
    await openWithFiles(page, "/es/unir-excel", ["workbook.xlsx", "table.tsv"]);
    const merged = fileOf(await runTool(page, "Unir"));
    expect(merged.name).toBe("unido.xlsx");
    expect(unzipText(merged.buf, "xl/workbook.xml")).toMatch(/name="Ventas"[\s\S]*name="Notas"[\s\S]*name="table"/);

    await page.getByRole("button", { name: /Empezar de nuevo/ }).click();
    await page.locator('input[type="file"]').first().setInputFiles([
      { name: "enero.csv", mimeType: "text/csv", buffer: Buffer.from("producto,total\nCafé,6.5\n") },
      { name: "febrero.csv", mimeType: "text/csv", buffer: Buffer.from("producto,total\nTé,9.5\n") },
    ]);
    await choose(page, "Todas en una sola hoja");
    await page.getByLabel("Agregar una columna con el archivo de origen").check();
    const stacked = fileOf(await runTool(page, "Unir"));
    expect(unzipText(stacked.buf, "xl/workbook.xml")).toContain('name="Unidas"');
    const sheet = xlsxText(stacked.buf);
    // One header row, then one row per file.
    expect(sheet.match(/<row /g)).toHaveLength(3);
    for (const text of ["Origen", "enero.csv", "febrero.csv", "Té"]) expect(sheet).toContain(text);
    expect(sheet).toMatch(/<v>6\.5<\/v>/);
  });
});

test.describe("tool: split-excel", () => {
  test("every sheet of a workbook as its own file", { tag: "@xb" }, async ({ page }) => {
    await openWithFiles(page, "/en/split-excel-sheets", ["workbook.ods"]);
    await page.getByRole("button", { name: "Split sheets", exact: true }).click();
    await expect(page.getByRole("button", { name: /ZIP/ })).toBeVisible({ timeout: 45_000 });
    const links = page.locator("main a[download]");
    expect(await links.evaluateAll((all) => all.map((a) => a.getAttribute("download")))).toEqual(["workbook-Ventas.xlsx", "workbook-Notas.xlsx"]);
    const [download] = await Promise.all([page.waitForEvent("download"), links.nth(1).click()]);
    const book = unzipSync(new Uint8Array(readFileSync((await download.path())!)));
    expect(strFromU8(book["xl/workbook.xml"]!)).toMatch(/<sheet [^>]*name="Notas"/);
    expect(strFromU8(book["xl/workbook.xml"]!).match(/<sheet /g)).toHaveLength(1);
    expect(strFromU8(book["xl/worksheets/sheet1.xml"]!) + strFromU8(book["xl/sharedStrings.xml"] ?? new Uint8Array())).toContain("segunda hoja ñ");
  });
});
