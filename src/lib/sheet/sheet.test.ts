// Outputs are checked without SheetJS: the XML inside the XLSX/ODS (fflate)
// and, when LibreOffice is installed, LibreOffice reading the file back.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strFromU8, unzipSync, zipSync } from "fflate";
import { afterAll, describe, expect, it } from "vitest";
import { convertSpreadsheet, type SheetOptions } from "./sheet";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const opts = (to: SheetOptions["to"], extra: Partial<SheetOptions> = {}): SheetOptions => ({ to, sheets: "all", delimiter: ",", bom: false, ...extra });
const text = (bytes: Uint8Array) => new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
const xmlOf = (bytes: Uint8Array, path: string) => strFromU8(unzipSync(bytes)[path]!);

const soffice = [process.env.SOFFICE, "soffice", "libreoffice"].filter((b): b is string => !!b).find((bin) => {
  try {
    execFileSync(bin, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
});
const work = mkdtempSync(join(tmpdir(), "sheet-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

/** First sheet as CSV, read back by LibreOffice (UTF-8, comma). */
function libreOfficeCsv(bytes: Uint8Array, ext: string): string {
  const dir = mkdtempSync(join(work, "lo-"));
  writeFileSync(join(dir, `book.${ext}`), bytes);
  execFileSync(soffice!, [`-env:UserInstallation=file://${join(work, "profile")}`, "--headless", "--convert-to", "csv:Text - txt - csv (StarCalc):44,34,76", "--outdir", dir, join(dir, `book.${ext}`)], { stdio: "ignore", timeout: 120_000 });
  return readFileSync(join(dir, "book.csv"), "utf8");
}

const VENTAS = ["producto,cantidad,precio,total,fecha", "Café,2,3.25,6.5,2024-03-15", "北京 té,1,9.5,9.5,2024-12-01", "código,007,0.1,16,"];

describe("convertSpreadsheet", () => {
  it.each(["workbook.xlsx", "workbook.ods"])("%s → CSV: one file per sheet, exact numbers, dates as shown, 007 kept", (name) => {
    const out = convertSpreadsheet(fixture(name), name, opts("csv"));
    expect(out.map((f) => f.sheet)).toEqual(["Ventas", "Notas"]);
    expect(text(out[0]!.bytes)).toBe(`${VENTAS.join("\r\n")}\r\n`);
    expect(text(out[1]!.bytes)).toBe("nota\r\nsegunda hoja ñ\r\n");
  });

  it("CSV for Excel in Spanish: semicolons, decimal comma, BOM, first sheet only", () => {
    const [only, ...rest] = convertSpreadsheet(fixture("workbook.xlsx"), "workbook.xlsx", opts("csv", { delimiter: ";", bom: true, sheets: "first" }));
    expect(rest).toEqual([]);
    expect(only!.sheet).toBe("");
    expect(text(only!.bytes)).toBe("﻿producto;cantidad;precio;total;fecha\r\nCafé;2;3,25;6,5;2024-03-15\r\n北京 té;1;9,5;9,5;2024-12-01\r\ncódigo;007;0,1;16;\r\n");
  });

  it("XLSX → ODS keeps both sheets, formulas and text", () => {
    const [ods] = convertSpreadsheet(fixture("workbook.xlsx"), "workbook.xlsx", opts("ods"));
    expect(strFromU8(unzipSync(ods!.bytes).mimetype!)).toBe("application/vnd.oasis.opendocument.spreadsheet");
    const content = xmlOf(ods!.bytes, "content.xml");
    expect(content).toContain('table:name="Ventas"');
    expect(content).toContain('table:name="Notas"');
    expect(content).toMatch(/table:formula="of:=\[\.B2\]\*\[\.C2\]"/);
    expect(content).toContain("北京 té");
  });

  it("ODS → XLSX keeps both sheets and formulas", () => {
    const [xlsx] = convertSpreadsheet(fixture("workbook.ods"), "workbook.ods", opts("xlsx"));
    expect(xmlOf(xlsx!.bytes, "xl/workbook.xml")).toMatch(/name="Ventas"[\s\S]*name="Notas"/);
    expect(xmlOf(xlsx!.bytes, "xl/worksheets/sheet1.xml")).toContain("<f>SUM(D2:D3)</f>");
  });

  it("an Excel CSV in Windows-1252 with ; and decimal commas becomes real numbers", () => {
    const [xlsx] = convertSpreadsheet(fixture("table-excel.csv"), "table-excel.csv", opts("xlsx"));
    expect(xmlOf(xlsx!.bytes, "xl/workbook.xml")).toContain('name="table-excel"');
    const sheet = xmlOf(xlsx!.bytes, "xl/worksheets/sheet1.xml");
    expect(sheet).toMatch(/<v>3\.25<\/v>/);
    expect(sheet).toMatch(/<v>9\.5<\/v>/);
  });

  it("reads XLS and TSV", () => {
    expect(text(convertSpreadsheet(fixture("spreadsheet.xls"), "s.xls", opts("csv"))[0]!.bytes)).toBe("name,qty,price\r\nalpha,1,9.5\r\nbeta,2,3.25\r\ngamma,3,0\r\n");
    const [ods] = convertSpreadsheet(fixture("table.tsv"), "table.tsv", opts("ods"));
    expect(xmlOf(ods!.bytes, "content.xml")).toContain('table:name="table"');
  });

  it("refuses binary data, damaged files, broken CSV quoting, zip bombs and too many cells", () => {
    const err = (bytes: Uint8Array, name: string) => {
      try {
        convertSpreadsheet(bytes, name, opts("xlsx"));
        return "ok";
      } catch (error) {
        return (error as { code?: string }).code;
      }
    };
    expect(err(fixture("corrupt/garbage.png"), "a.xlsx")).toBe("fileDamaged");
    expect(err(fixture("corrupt/random-as.docx"), "a.xlsx")).toBe("fileDamaged");
    expect(err(fixture("workbook.xlsx").slice(0, 2000), "cut.xlsx")).toBe("fileDamaged");
    expect(err(fixture("corrupt/bad-quotes.csv"), "q.csv")).toBe("invalidData");
    // A ZIP whose central directory claims 4 GB for one entry: refused before inflating.
    const zip = zipSync({ "xl/workbook.xml": new TextEncoder().encode("<workbook/>") });
    const view = new DataView(zip.buffer);
    const central = zip.length - 22 - (46 + "xl/workbook.xml".length);
    expect(view.getUint32(central, true)).toBe(0x02014b50);
    view.setUint32(central + 24, 0xfffffff0, true);
    expect(err(zip, "bomb.xlsx")).toBe("tooManyCells");
    expect(err(new TextEncoder().encode(`${"1,".repeat(1_000_001)}\n${"2,".repeat(1_000_001)}`), "big.csv")).toBe("tooManyCells");
  });
});

describe.runIf(soffice)("LibreOffice reads the outputs back", () => {
  it.each([
    ["workbook.ods", "xlsx"],
    ["workbook.xlsx", "ods"],
  ] as const)("%s → %s", { timeout: 120_000 }, (name, to) => {
    const [out] = convertSpreadsheet(fixture(name), name, opts(to));
    expect(libreOfficeCsv(out!.bytes, to).trim().split("\n")).toEqual(VENTAS.map((l) => l.replace(/,$/, ",")));
  });

  it("CSV (Excel in Spanish) → XLSX keeps accents and decimal numbers", { timeout: 120_000 }, () => {
    const [xlsx] = convertSpreadsheet(fixture("table-excel.csv"), "table-excel.csv", opts("xlsx"));
    expect(libreOfficeCsv(xlsx!.bytes, "xlsx").trim().split("\n")).toEqual(["nombre,cantidad,precio", "Cañón,2,3.25", "Açaí,1,9.5"]);
  });
});
