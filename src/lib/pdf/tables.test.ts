// Fixtures written by scripts/fixtures/tables.mjs; read with pdf.js as the browser does.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeTables } from "@/lib/sheet/sheet";
import { extractPdfTables, groupTables, pageTables, tableValue, type TextRun } from "./tables";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));
const open = async (name: string) => {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return getDocument({ data: fixture(name), verbosity: 0 }).promise;
};

describe("tableValue", () => {
  it.each([
    ["3.25", ".", 3.25],
    ["1,250.75", ".", 1250.75],
    ["1.234,56", ",", 1234.56],
    ["1 250,5", ",", 1250.5],
    ["1.500", ",", 1500],
    ["-84,35", ",", -84.35],
    ["−2", ",", -2],
    ["120", ".", 120],
    ["0,99", ",", 0.99],
  ] as const)("%s with %s → %s", (text, decimal, value) => {
    expect(tableValue(text, decimal)).toBe(value);
  });

  it.each(["007", "02/01/2024", "A-12", "$ 3.25", "12 %", "1234567890123456", "1.2.3"])("keeps %s as text", (text) => {
    expect(tableValue(text, ".")).toBe(text);
    expect(tableValue(text, ",")).toBe(text);
  });
});

describe("pageTables", () => {
  const run = (str: string, x: number, y: number, width = str.length * 5): TextRun => ({ str, x, y, width, size: 10 });

  it("splits a run with wide inner spacing and fills empty cells with null", () => {
    const tables = pageTables([run("a", 50, 700), run("b", 150, 700), run(`1${" ".repeat(19)}2`, 50, 680, 105), run("x", 50, 660), run("3", 150, 660)], 1);
    expect(tables).toEqual([{ page: 1, detected: true, rows: [["a", "b"], [1, 2], ["x", 3]] }]);
  });

  it("gives the lines of a page without a table", () => {
    expect(pageTables([run("Hola mundo", 50, 700), run("Segunda línea", 50, 680)], 2)).toEqual([
      { page: 2, detected: false, rows: [["Hola mundo"], ["Segunda línea"]] },
    ]);
  });
});

describe("extractPdfTables", () => {
  it("a simple table: header, codes as text, right-aligned numbers, the text around it left out", async () => {
    const tables = await extractPdfTables(await open("table-simple.pdf"));
    expect(tables).toEqual([
      {
        page: 1,
        detected: true,
        rows: [
          ["Code", "Product", "Price", "Qty", "Total"],
          ["007", "Coffee beans", 3.25, 2, 6.5],
          ["A-12", "Green tea", 9.5, 1, 9.5],
          ["B-3", "Dark chocolate", 1250.75, 10, 12507.5],
          ["C-44", "Café con leche", 0.1, 120, 12],
        ],
      },
    ]);
  });

  it("several pages, empty cells and decimal commas", async () => {
    const progress: number[] = [];
    const tables = await extractPdfTables(await open("table-pages.pdf"), { onProgress: (p) => progress.push(p) });
    expect(progress).toEqual([0.5, 1]);
    expect(tables.map((t) => t.page)).toEqual([1, 2]);
    expect(tables[0]!.rows).toEqual([
      ["Fecha", "Concepto", "Débito", "Crédito"],
      ["02/01/2024", "Saldo inicial", null, 1500],
      ["05/01/2024", "Supermercado", 84.35, null],
      ["09/01/2024", "Transferencia recibida", null, 12000.5],
      ["15/01/2024", "Farmacia", 1234.56, null],
    ]);
    expect(tables[1]!.rows.at(-1)).toEqual(["28/01/2024", "Comisión", 0.99, null]);
  });

  it("two tables on one page, with spaces as thousands separators", async () => {
    const tables = await extractPdfTables(await open("table-two.pdf"));
    expect(tables.map((t) => t.rows)).toEqual([
      [
        ["Región", "Enero", "Febrero", "Marzo"],
        ["Norte", 1250.5, 980, 1100],
        ["Sur", 860, null, 905.25],
        ["Centro", 2010, 1990.75, 2300],
      ],
      [
        ["Nombre", "Área", "Años"],
        ["Ana Pérez", "Ventas", 4],
        ["Luis Gómez", "Logística", 12],
      ],
    ]);
  });

  it("the decimal separator can be forced", async () => {
    const [table] = await extractPdfTables(await open("table-simple.pdf"), { decimal: "," });
    expect(table!.rows[1]).toEqual(["007", "Coffee beans", "3.25", 2, "6.50"]);
  });

  it("a scan has no text: pdfIsScanned", async () => {
    await expect(extractPdfTables(await open("scan.pdf"))).rejects.toMatchObject({ code: "pdfIsScanned" });
  });
});

describe("PDF tables → XLSX, read back by openpyxl", () => {
  const python = (() => {
    try {
      execFileSync("python3", ["-c", "import openpyxl"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();
  const names = { page: (n: number) => `Página ${n}`, table: (n: number) => `Tabla ${n}`, all: "Tablas" };

  it("groups tables by page, by table or in one sheet", async () => {
    const tables = await extractPdfTables(await open("table-two.pdf"));
    expect(groupTables(tables, "page", names).map((s) => [s.name, s.rows.length])).toEqual([["Página 1", 4 + 1 + 3]]);
    expect(groupTables(tables, "table", names).map((s) => s.name)).toEqual(["Tabla 1", "Tabla 2"]);
    expect(groupTables(tables, "all", names)[0]!.rows[4]).toEqual([]);
  });

  it.runIf(python)("one sheet per page with real numbers, empty cells and text kept", async () => {
    const sheets = groupTables(await extractPdfTables(await open("table-pages.pdf")), "page", names);
    const [xlsx] = writeTables(sheets, { to: "xlsx", delimiter: ",", bom: false });
    const dir = mkdtempSync(join(tmpdir(), "tables-"));
    try {
      writeFileSync(join(dir, "t.xlsx"), xlsx!.bytes);
      const out = execFileSync("python3", ["-I", "-c", [
        "import openpyxl, sys, json",
        "wb = openpyxl.load_workbook(sys.argv[1])",
        "print(json.dumps({ws.title: [[c.value for c in r] for r in ws.iter_rows()] for ws in wb}, ensure_ascii=False))",
      ].join("\n"), join(dir, "t.xlsx")], { encoding: "utf8" });
      const book = JSON.parse(out) as Record<string, unknown[][]>;
      expect(Object.keys(book)).toEqual(["Página 1", "Página 2"]);
      expect(book["Página 1"]![2]).toEqual(["05/01/2024", "Supermercado", 84.35, null]);
      expect(book["Página 2"]![1]).toEqual(["20/01/2024", "Luz", 8765.4, null]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("CSV: one file per sheet, with the chosen separator", async () => {
    const sheets = groupTables(await extractPdfTables(await open("table-pages.pdf")), "page", names);
    const files = writeTables(sheets, { to: "csv", delimiter: ";", bom: false });
    expect(files.map((f) => f.sheet)).toEqual(["Página 1", "Página 2"]);
    expect(new TextDecoder().decode(files[0]!.bytes).split("\r\n")[4]).toBe("15/01/2024;Farmacia;1234,56;");
  });
});
