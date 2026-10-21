// Spreadsheets: XLSX, XLS, ODS and CSV/TSV in; XLSX, ODS or CSV out. Runs in
// the data worker, loaded only by the spreadsheet converter (SheetJS CE is
// ~1 MB). Values, formulas and every sheet are kept; formatting (colors,
// fonts, borders, column widths) is not, because SheetJS CE does not write it.
import Papa from "papaparse";
import { unzipSync } from "fflate";
import * as XLSX from "xlsx";
import { ConversionError } from "@/lib/convert-error";
import { decodeText, stripBom } from "@/lib/data/text";

export type SheetTarget = "xlsx" | "ods" | "csv";

export interface SheetOptions {
  to: SheetTarget;
  /** CSV only: every sheet as its own file, or just the first one. */
  sheets: "first" | "all";
  /** CSV only: "," (international) or ";" with decimal comma (Excel in Spanish, Portuguese, French). */
  delimiter: "," | ";";
  /** CSV only: a UTF-8 byte order mark, so Excel reads accents right. */
  bom: boolean;
}

export interface SheetFile {
  /** Sheet name for one-CSV-per-sheet outputs, else "". */
  sheet: string;
  bytes: Uint8Array;
}

/** Cells actually holding something; beyond this a tab can run out of memory. */
export const MAX_CELLS = 2_000_000;
/** What an XLSX/ODS may declare to unzip to (a zip bomb is refused before reading). */
export const MAX_UNZIPPED_BYTES = 400 * 1024 * 1024;

const damaged = () => new ConversionError("fileDamaged");

const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((b, i) => bytes[i] === b);

/** Sum of the sizes a ZIP declares for its entries, read from the central directory without inflating. */
function declaredUnzippedSize(bytes: Uint8Array): number {
  let total = 0;
  try {
    unzipSync(bytes, {
      filter: (file) => {
        total += file.originalSize;
        return false;
      },
    });
  } catch {
    throw damaged();
  }
  return total;
}

const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;
const COMMA_NUMBER = /^-?(0|[1-9]\d{0,2}(\.\d{3})+|[1-9]\d*)(,\d+)?$/;

/** A CSV cell as a number when it reads back exactly ("007" and huge integers stay text). */
function csvValue(raw: string, decimalComma: boolean): string | number {
  const text = raw.trim();
  let candidate: string | null = null;
  if (NUMBER.test(text)) candidate = text;
  else if (decimalComma && COMMA_NUMBER.test(text)) candidate = text.replace(/\./g, "").replace(",", ".");
  if (candidate === null) return raw;
  const n = Number(candidate);
  return Number.isFinite(n) && (!Number.isInteger(n) || Number.isSafeInteger(n)) ? n : raw;
}

function readCsv(bytes: Uint8Array, name: string): XLSX.WorkBook {
  const parsed = Papa.parse<string[]>(stripBom(decodeText(bytes)), {
    delimitersToGuess: [",", ";", "\t", "|"],
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.some((e) => e.type === "Quotes") || parsed.data.length === 0) throw new ConversionError("invalidData");
  const cells = parsed.data.reduce((sum, row) => sum + row.length, 0);
  if (cells > MAX_CELLS) throw new ConversionError("tooManyCells");
  // ";" is how Excel saves CSV where the decimal separator is a comma.
  const decimalComma = parsed.meta.delimiter === ";";
  const rows = parsed.data.map((row) => row.map((cell) => csvValue(cell, decimalComma)));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows, { dense: true }), sheetName(name));
  return book;
}

/** Excel sheet names: up to 31 characters, none of []:*?/\ */
function sheetName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet1";
}

type Cell = XLSX.CellObject | undefined;
const rowsOf = (sheet: XLSX.WorkSheet): Cell[][] => (sheet["!data"] as Cell[][] | undefined) ?? [];

function countCells(book: XLSX.WorkBook): number {
  let count = 0;
  for (const name of book.SheetNames) for (const row of rowsOf(book.Sheets[name]!)) if (row) count += row.filter(Boolean).length;
  return count;
}

function readBook(bytes: Uint8Array, name: string): XLSX.WorkBook {
  const zip = startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
  const ole = startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (!zip && !ole) {
    // Anything else must be text (CSV/TSV); binary data is not a spreadsheet.
    if (bytes.length === 0 || bytes.subarray(0, 4096).some((b) => b === 0)) throw damaged();
    return readCsv(bytes, name);
  }
  if (zip && declaredUnzippedSize(bytes) > MAX_UNZIPPED_BYTES) throw new ConversionError("tooManyCells");
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(bytes, { type: "array", dense: true, cellNF: true, cellFormula: true, cellHTML: false, WTF: false });
  } catch {
    throw damaged();
  }
  if (!book.SheetNames.length) throw damaged();
  if (countCells(book) > MAX_CELLS) throw new ConversionError("tooManyCells");
  return book;
}

/** A cell as CSV text: exact numbers (with decimal comma if asked), dates and others as displayed. */
function cellText(cell: Cell, decimalComma: boolean): string {
  if (!cell || cell.v === undefined || cell.v === null) return "";
  if (cell.t === "n" && !(typeof cell.z === "string" && XLSX.SSF.is_date(cell.z))) {
    const text = String(cell.v);
    return decimalComma ? text.replace(".", ",") : text;
  }
  if (cell.t === "b") return cell.v ? "TRUE" : "FALSE";
  return cell.w ?? String(cell.v);
}

function sheetToCsv(sheet: XLSX.WorkSheet, { delimiter, bom }: SheetOptions): Uint8Array {
  const rows = rowsOf(sheet).map((row) => (row ?? []).map((cell) => cellText(cell, delimiter === ";")));
  // Trailing empty rows add nothing; every row gets the same number of columns.
  while (rows.length && rows[rows.length - 1]!.every((c) => c === "")) rows.pop();
  const width = Math.max(0, ...rows.map((row) => row.length));
  for (const row of rows) while (row.length < width) row.push("");
  const csv = Papa.unparse(rows, { delimiter, newline: "\r\n" });
  return new TextEncoder().encode(`${bom ? "﻿" : ""}${csv}\r\n`);
}

/** Converts a spreadsheet; CSV with `sheets: "all"` gives one file per sheet. */
export function convertSpreadsheet(bytes: Uint8Array, name: string, options: SheetOptions): SheetFile[] {
  const book = readBook(bytes, name);
  if (options.to === "csv") {
    const names = options.sheets === "all" ? book.SheetNames : book.SheetNames.slice(0, 1);
    return names.map((sheet) => ({ sheet: names.length > 1 ? sheet : "", bytes: sheetToCsv(book.Sheets[sheet]!, options) }));
  }
  const out = XLSX.write(book, { type: "array", bookType: options.to, compression: true }) as ArrayBuffer;
  return [{ sheet: "", bytes: new Uint8Array(out) }];
}
