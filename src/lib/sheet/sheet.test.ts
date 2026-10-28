// Outputs are checked without SheetJS: the XML inside the XLSX/ODS (fflate)
// and, when LibreOffice is installed, LibreOffice reading the file back.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strFromU8, unzipSync, zipSync } from "fflate";
import { afterAll, describe, expect, it } from "vitest";
import { convertSpreadsheet, listSheets, mergeSpreadsheets, splitSpreadsheet, type MergeOptions, type SheetOptions } from "./sheet";

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
const python = (() => {
  try {
    execFileSync("python3", ["-c", "import openpyxl"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
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

const json = (bytes: Uint8Array) => JSON.parse(text(bytes)) as unknown;
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

describe("Excel ↔ JSON and picking a sheet", () => {
  it("lists the sheets with the rows and columns holding data", () => {
    expect(listSheets(fixture("workbook.xlsx"), "workbook.xlsx")).toEqual([
      { name: "Ventas", rows: 4, columns: 5 },
      { name: "Notas", rows: 2, columns: 1 },
    ]);
    expect(listSheets(fixture("table.csv"), "table.csv").map((s) => s.name)).toEqual(["table"]);
  });

  it("one sheet → CSV by name", () => {
    const out = convertSpreadsheet(fixture("workbook.ods"), "workbook.ods", opts("csv", { sheet: "Notas" }));
    expect(out).toHaveLength(1);
    expect(out[0]!.sheet).toBe("");
    expect(text(out[0]!.bytes)).toBe("nota\r\nsegunda hoja ñ\r\n");
    expect(() => convertSpreadsheet(fixture("workbook.ods"), "workbook.ods", opts("csv", { sheet: "Nope" }))).toThrow();
  });

  it("tab-separated output", () => {
    const [out] = convertSpreadsheet(fixture("workbook.xlsx"), "w.xlsx", opts("csv", { sheet: "Ventas", delimiter: "\t" }));
    expect(text(out!.bytes).split("\r\n")[1]).toBe("Café\t2\t3.25\t6.5\t2024-03-15");
  });

  it.each(["workbook.xlsx", "workbook.ods"])("%s → JSON: objects keyed by the header, real numbers, ISO dates, 007 kept as text", (name) => {
    const [first] = convertSpreadsheet(fixture(name), name, opts("json", { sheets: "first" }));
    expect(json(first!.bytes)).toEqual([
      { producto: "Café", cantidad: 2, precio: 3.25, total: 6.5, fecha: "2024-03-15" },
      { producto: "北京 té", cantidad: 1, precio: 9.5, total: 9.5, fecha: "2024-12-01" },
      { producto: "código", cantidad: "007", precio: 0.1, total: 16, fecha: null },
    ]);
    const [all] = convertSpreadsheet(fixture(name), name, opts("json"));
    expect(Object.keys(json(all!.bytes) as object)).toEqual(["Ventas", "Notas"]);
    expect((json(all!.bytes) as Record<string, unknown>).Notas).toEqual([{ nota: "segunda hoja ñ" }]);
    const [arrays] = convertSpreadsheet(fixture(name), name, opts("json", { sheet: "Notas", json: "arrays" }));
    expect(json(arrays!.bytes)).toEqual([["nota"], ["segunda hoja ñ"]]);
  });

  it("CSV → workbook: integers longer than Excel's 15 digits stay text", () => {
    const csv = new TextEncoder().encode("card,n\n4111111111111111,123456789012345\n");
    const [out] = convertSpreadsheet(csv, "c.csv", opts("json"));
    expect(json(out!.bytes)).toEqual([{ card: "4111111111111111", n: 123456789012345 }]);
  });

  it("JSON keys: empty headers get a name, repeated ones a suffix", () => {
    const csv = new TextEncoder().encode("a,,a\n1,2,3\n");
    const [out] = convertSpreadsheet(csv, "t.csv", opts("json"));
    expect(json(out!.bytes)).toEqual([{ a: 1, column2: 2, a_2: 3 }]);
  });

  it("JSON → XLSX: keys as columns (in order of appearance), types kept, nested values as JSON text", () => {
    const data = [
      { name: "Ana", age: 31, active: true, since: "2024-03-15" },
      { name: "Bo", city: "Córdoba", tags: ["a", "b"], since: "2024-02-31" },
    ];
    const [xlsx] = convertSpreadsheet(encode(data), "people.json", opts("xlsx"));
    expect(xmlOf(xlsx!.bytes, "xl/workbook.xml")).toContain('name="people"');
    const back = convertSpreadsheet(xlsx!.bytes, "people.xlsx", opts("json"))[0]!;
    expect(json(back.bytes)).toEqual([
      { name: "Ana", age: 31, active: true, since: "2024-03-15", city: null, tags: null },
      { name: "Bo", age: null, active: null, since: "2024-02-31", city: "Córdoba", tags: '["a","b"]' },
    ]);
  });

  it("JSON → workbook: an object of lists gives one sheet each; lists of lists and of values work", () => {
    const [xlsx] = convertSpreadsheet(encode({ Clientes: [{ id: 1 }], Ventas: [[1, 2], [3, 4]] }), "x.json", opts("xlsx"));
    expect(listSheets(xlsx!.bytes, "x.xlsx")).toEqual([
      { name: "Clientes", rows: 2, columns: 1 },
      { name: "Ventas", rows: 2, columns: 2 },
    ]);
    const [csv] = convertSpreadsheet(encode([1, null, "dos"]), "v.json", opts("csv"));
    expect(text(csv!.bytes)).toBe("value\r\n1\r\n\r\ndos\r\n");
  });

  it("refuses JSON that is not a table", () => {
    const code = (bytes: Uint8Array) => {
      try {
        convertSpreadsheet(bytes, "a.json", opts("xlsx"));
        return "ok";
      } catch (error) {
        return (error as { code?: string }).code;
      }
    };
    expect(code(new TextEncoder().encode("{ broken"))).toBe("invalidData");
    expect(code(encode(42))).toBe("invalidData");
    expect(code(encode("text"))).toBe("invalidData");
  });
});

describe("merge and split", () => {
  const csv = (name: string, body: string) => ({ name, bytes: new TextEncoder().encode(body) });
  const merge = (files: Parameters<typeof mergeSpreadsheets>[0], extra: Partial<MergeOptions> = {}) =>
    mergeSpreadsheets(files, { mode: "sheets", to: "xlsx", skipRepeatedHeader: true, stackedName: "Unidas", ...extra });

  it("one sheet per sheet: one-sheet files named after the file, names kept unique", () => {
    const out = merge([{ name: "workbook.xlsx", bytes: fixture("workbook.xlsx") }, csv("enero.csv", "a,b\n1,2\n"), csv("Ventas.csv", "x\n1\n")]);
    expect(listSheets(out.bytes, "m.xlsx").map((s) => s.name)).toEqual(["Ventas", "Notas", "enero", "Ventas (2)"]);
    // Formulas inside a sheet are kept.
    expect(xmlOf(out.bytes, "xl/worksheets/sheet1.xml")).toContain("<f>SUM(D2:D3)</f>");
  });

  it("stacked: the shared header once, values only, an optional source column", () => {
    const files = [csv("enero.csv", "producto,total\nCafé,6.5\n"), csv("febrero.csv", "producto,total\nTé,9.5\nPan,1\n"), csv("otra.csv", "x,y\n1,2\n")];
    const plain = merge(files, { mode: "stack" });
    expect(listSheets(plain.bytes, "m.xlsx")).toEqual([{ name: "Unidas", rows: 6, columns: 2 }]);
    expect(json(convertSpreadsheet(plain.bytes, "m.xlsx", opts("json", { json: "arrays" }))[0]!.bytes)).toEqual([
      ["producto", "total"], ["Café", 6.5], ["Té", 9.5], ["Pan", 1], ["x", "y"], [1, 2],
    ]);
    const sourced = merge(files.slice(0, 2), { mode: "stack", sourceColumn: "Origen" });
    expect(json(convertSpreadsheet(sourced.bytes, "m.xlsx", opts("json"))[0]!.bytes)).toEqual([
      { Origen: "enero.csv", producto: "Café", total: 6.5 },
      { Origen: "febrero.csv", producto: "Té", total: 9.5 },
      { Origen: "febrero.csv", producto: "Pan", total: 1 },
    ]);
    // Rows that move lose their formulas but keep the computed value.
    const book = merge([{ name: "workbook.ods", bytes: fixture("workbook.ods") }], { mode: "stack", skipRepeatedHeader: false, to: "ods" });
    const content = xmlOf(book.bytes, "content.xml");
    expect(content).not.toContain("table:formula");
    expect(content).toContain("segunda hoja ñ");
  });

  it("splits every sheet into its own file", () => {
    const parts = splitSpreadsheet(fixture("workbook.xlsx"), "workbook.xlsx", { to: "xlsx", delimiter: ",", bom: false });
    expect(parts.map((p) => p.sheet)).toEqual(["Ventas", "Notas"]);
    expect(listSheets(parts[1]!.bytes, "n.xlsx")).toEqual([{ name: "Notas", rows: 2, columns: 1 }]);
    expect(xmlOf(parts[0]!.bytes, "xl/worksheets/sheet1.xml")).toContain("<f>SUM(D2:D3)</f>");
    const csvs = splitSpreadsheet(fixture("workbook.ods"), "workbook.ods", { to: "csv", delimiter: ";", bom: false });
    expect(csvs.map((p) => [p.sheet, text(p.bytes)])).toEqual([
      ["Ventas", expect.stringContaining("Café;2;3,25;6,5;2024-03-15")],
      ["Notas", "nota\r\nsegunda hoja ñ\r\n"],
    ]);
    const ods = splitSpreadsheet(fixture("workbook.xlsx"), "workbook.xlsx", { to: "ods", delimiter: ",", bom: false });
    expect(xmlOf(ods[1]!.bytes, "content.xml")).toContain('table:name="Notas"');
  });
});

describe.runIf(soffice)("LibreOffice opens merged and split workbooks", () => {
  it("merged sheets and a split sheet", { timeout: 120_000 }, () => {
    const merged = mergeSpreadsheets([{ name: "workbook.ods", bytes: fixture("workbook.ods") }, { name: "spreadsheet.xls", bytes: fixture("spreadsheet.xls") }], { mode: "stack", to: "xlsx", skipRepeatedHeader: true, stackedName: "Todo" });
    const lines = libreOfficeCsv(merged.bytes, "xlsx").trim().split("\n");
    expect(lines[0]).toBe("producto,cantidad,precio,total,fecha");
    expect(lines).toContain("Café,2,3.25,6.5,2024-03-15");
    expect(lines).toContain("alpha,1,9.5,,");
    const [ventas] = splitSpreadsheet(fixture("workbook.xlsx"), "workbook.xlsx", { to: "xlsx", delimiter: ",", bom: false });
    expect(libreOfficeCsv(ventas!.bytes, "xlsx").trim().split("\n")).toEqual(VENTAS.map((l) => l.replace(/,$/, ",")));
  });
});

describe.runIf(python)("openpyxl reads JSON → XLSX back", () => {
  it("dates are real dates, numbers numbers, booleans booleans, accents kept", () => {
    const data = [{ fecha: "2024-03-15", hora: "2024-03-15T10:30:00", monto: 1234.5, ok: false, nombre: "Ñandú 北京" }];
    const [xlsx] = convertSpreadsheet(encode(data), "d.json", opts("xlsx"));
    const file = join(work, "d.xlsx");
    writeFileSync(file, xlsx!.bytes);
    const out = execFileSync("python3", ["-I", "-c", [
      "import openpyxl, sys, json",
      "ws = openpyxl.load_workbook(sys.argv[1]).active",
      "print(json.dumps([[type(c.value).__name__, str(c.value)] for c in ws[2]], ensure_ascii=False))",
    ].join("\n"), file], { encoding: "utf8" });
    expect(JSON.parse(out)).toEqual([
      ["datetime", "2024-03-15 00:00:00"],
      ["datetime", "2024-03-15 10:30:00"],
      ["float", "1234.5"],
      ["bool", "False"],
      ["str", "Ñandú 北京"],
    ]);
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
