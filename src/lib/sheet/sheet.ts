// Spreadsheets: XLSX, XLS, ODS, CSV/TSV and JSON in; XLSX, ODS, CSV or JSON out. Runs in
// the data worker, loaded only by the spreadsheet converter (SheetJS CE is
// ~1 MB). Values, formulas and every sheet are kept; formatting (colors,
// fonts, borders, column widths) is not, because SheetJS CE does not write it.
import Papa from "papaparse";
import { unzipSync } from "fflate";
import * as XLSX from "xlsx";
import { ConversionError } from "@/lib/convert-error";
import { decodeText, stripBom } from "@/lib/data/text";
import type { TableSheet } from "@/lib/pdf/tables";

export type SheetTarget = "xlsx" | "ods" | "csv" | "json";

export interface SheetOptions {
  to: SheetTarget;
  /** CSV and JSON only: every sheet (one CSV each, or one JSON object keyed by sheet), or just the first one. */
  sheets: "first" | "all";
  /** CSV and JSON only: just this sheet (by name), instead of `sheets`. */
  sheet?: string;
  /** CSV only: "," (international), ";" with decimal comma (Excel in Spanish, Portuguese, French) or tab. */
  delimiter: "," | ";" | "\t";
  /** CSV only: a UTF-8 byte order mark, so Excel reads accents right. */
  bom: boolean;
  /** JSON only: rows as objects keyed by the first row (default), or as plain lists of cells. */
  json?: "objects" | "arrays";
}

export interface SheetSummary {
  name: string;
  /** Rows and columns holding data (trailing empty ones not counted). */
  rows: number;
  columns: number;
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

/** Excel keeps 15 significant digits: longer integers (card numbers, bank accounts) stay text. */
const EXCEL_MAX_INTEGER = 1e15;

/** A CSV cell as a number when it reads back exactly ("007" and long integers stay text). */
function csvValue(raw: string, decimalComma: boolean): string | number {
  const text = raw.trim();
  let candidate: string | null = null;
  if (NUMBER.test(text)) candidate = text;
  else if (decimalComma && COMMA_NUMBER.test(text)) candidate = text.replace(/\./g, "").replace(",", ".");
  if (candidate === null) return raw;
  const n = Number(candidate);
  return Number.isFinite(n) && (!Number.isInteger(n) || Math.abs(n) < EXCEL_MAX_INTEGER) ? n : raw;
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
  return fileName.replace(/\.(xlsx|xls|ods|csv|tsv|txt|json)$/i, "").replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet1";
}

type Cell = XLSX.CellObject | undefined;
const rowsOf = (sheet: XLSX.WorkSheet): Cell[][] => (sheet["!data"] as Cell[][] | undefined) ?? [];

function countCells(book: XLSX.WorkBook): number {
  let count = 0;
  for (const name of book.SheetNames) for (const row of rowsOf(book.Sheets[name]!)) if (row) count += row.filter(Boolean).length;
  return count;
}

const DAY_MS = 86_400_000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/** "2024-03-15" or "2024-03-15T10:30:00" (no time zone: a calendar date) as an Excel date cell. */
function isoDateCell(text: string): XLSX.CellObject | null {
  const m = ISO_DATE.exec(text);
  if (!m) return null;
  const [y, mo, d, h = "0", mi = "0", sec = "0"] = m.slice(1).map((part) => part ?? "0") as string[];
  const ms = Date.UTC(+y!, +mo! - 1, +d!, +h, +mi, +sec);
  const back = new Date(ms);
  // 2024-02-31 is not a date: keep it as text.
  if (back.getUTCMonth() !== +mo! - 1 || back.getUTCDate() !== +d! || +h > 23 || +mi > 59 || +sec > 59) return null;
  const withTime = m[4] !== undefined;
  return { t: "n", v: (ms - EXCEL_EPOCH) / DAY_MS, z: withTime ? "yyyy-mm-dd hh:mm:ss" : "yyyy-mm-dd" };
}

/** A JSON value as a cell: numbers and booleans as such, ISO dates as dates, objects as JSON text. */
function jsonCell(value: unknown): XLSX.CellObject | string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return isoDateCell(value) ?? value;
  return JSON.stringify(value);
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** A list of rows (objects, lists or single values) as a table, with a header row for objects. */
function jsonRows(list: unknown[]): unknown[][] {
  if (list.every(isRecord)) {
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const row of list) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) keys.push(key);
        seen.add(key);
      }
    }
    return [keys, ...list.map((row) => keys.map((key) => row[key]))];
  }
  if (list.every(Array.isArray)) return list as unknown[][];
  return [["value"], ...list.map((value) => [value])];
}

/**
 * JSON as a workbook: a list of objects (keys → columns), a list of lists, or
 * an object whose values are all lists (one sheet each). A single object is one row.
 */
function readJson(bytes: Uint8Array, name: string): XLSX.WorkBook {
  let data: unknown;
  try {
    data = JSON.parse(stripBom(decodeText(bytes)));
  } catch {
    throw new ConversionError("invalidData");
  }
  const sheets: [string, unknown[]][] = Array.isArray(data)
    ? [[sheetName(name), data]]
    : isRecord(data) && Object.keys(data).length > 0 && Object.values(data).every(Array.isArray)
      ? (Object.entries(data) as [string, unknown[]][])
      : isRecord(data)
        ? [[sheetName(name), [data]]]
        : [];
  if (sheets.length === 0) throw new ConversionError("invalidData");
  const book = XLSX.utils.book_new();
  let cells = 0;
  for (const [title, list] of sheets) {
    const rows = jsonRows(list).map((row) => row.map(jsonCell));
    cells += rows.reduce((sum, row) => sum + row.length, 0);
    if (cells > MAX_CELLS) throw new ConversionError("tooManyCells");
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows, { dense: true }), uniqueSheetName(book, title));
  }
  return book;
}

/** A valid sheet name not yet in the book ("Data", "Data (2)"...). */
function uniqueSheetName(book: XLSX.WorkBook, wanted: string): string {
  const base = sheetName(wanted);
  const taken = new Set(book.SheetNames.map((n) => n.toLowerCase()));
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base.slice(0, 31 - ` (${n})`.length)} (${n})`;
  return name;
}

function readBook(bytes: Uint8Array, name: string): XLSX.WorkBook {
  const zip = startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
  const ole = startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (!zip && !ole) {
    // Anything else must be text (CSV/TSV); binary data is not a spreadsheet.
    if (bytes.length === 0 || bytes.subarray(0, 4096).some((b) => b === 0)) throw damaged();
    return /\.json$/i.test(name) ? readJson(bytes, name) : readCsv(bytes, name);
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

/** Excel's serial date as "2024-03-15", "2024-03-15T10:30:00" or, for a time of day alone, "10:30:00". */
function serialToIso(serial: number, date1904: boolean): string {
  const p = XLSX.SSF.parse_date_code(serial, { date1904 });
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const time = `${pad(p.H)}:${pad(p.M)}:${pad(p.S)}`;
  if (serial < 1 && !date1904) return time;
  const date = `${pad(p.y, 4)}-${pad(p.m)}-${pad(p.d)}`;
  return Number.isInteger(serial) ? date : `${date}T${time}`;
}

/** A cell as a JSON value: numbers, booleans, dates as ISO text, errors as shown, empty as null. */
function cellJson(cell: Cell, date1904: boolean): string | number | boolean | null {
  if (!cell || cell.v === undefined || cell.v === null || cell.v === "") return null;
  if (cell.t === "n") return typeof cell.z === "string" && XLSX.SSF.is_date(cell.z) ? serialToIso(cell.v as number, date1904) : (cell.v as number);
  if (cell.t === "b") return Boolean(cell.v);
  if (cell.t === "d") return (cell.v as Date).toISOString().replace(/\.000Z$/, "").replace(/T00:00:00$/, "");
  if (cell.t === "e") return cell.w ?? "#ERROR";
  return String(cell.v);
}

/** Non-empty rows of a sheet as JSON values, all of the same width. */
function sheetJsonRows(sheet: XLSX.WorkSheet, date1904: boolean): (string | number | boolean | null)[][] {
  const rows = rowsOf(sheet)
    .map((row) => (row ?? []).map((cell) => cellJson(cell, date1904)))
    .filter((row) => row.some((v) => v !== null));
  const width = Math.max(0, ...rows.map((row) => row.length));
  for (const row of rows) while (row.length < width) row.push(null);
  return rows;
}

/** Header names for JSON keys: empty ones become "column3", repeated ones "name_2". */
function headerKeys(header: (string | number | boolean | null)[]): string[] {
  const used = new Set<string>();
  return header.map((value, i) => {
    const base = value === null ? `column${i + 1}` : String(value).trim() || `column${i + 1}`;
    let key = base;
    for (let n = 2; used.has(key); n++) key = `${base}_${n}`;
    used.add(key);
    return key;
  });
}

function sheetToJsonValue(sheet: XLSX.WorkSheet, shape: "objects" | "arrays", date1904: boolean): unknown[] {
  const rows = sheetJsonRows(sheet, date1904);
  if (shape === "arrays" || rows.length === 0) return rows;
  const keys = headerKeys(rows[0]!);
  return rows.slice(1).map((row) => Object.fromEntries(keys.map((key, i) => [key, row[i] ?? null])));
}

/** Sheets a CSV/JSON output takes: one by name, the first one, or all. */
function pickedSheets(book: XLSX.WorkBook, options: SheetOptions): string[] {
  if (options.sheet !== undefined) {
    if (!book.SheetNames.includes(options.sheet)) throw new ConversionError("invalidData");
    return [options.sheet];
  }
  return options.sheets === "all" ? book.SheetNames : book.SheetNames.slice(0, 1);
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
  if (options.to === "json") {
    const names = pickedSheets(book, options);
    const date1904 = Boolean(book.Workbook?.WBProps?.date1904);
    const value = (sheet: string) => sheetToJsonValue(book.Sheets[sheet]!, options.json ?? "objects", date1904);
    // Several sheets: one object with a list per sheet, in book order.
    const data = names.length === 1 ? value(names[0]!) : Object.fromEntries(names.map((sheet) => [sheet, value(sheet)]));
    return [{ sheet: "", bytes: new TextEncoder().encode(`${JSON.stringify(data, null, 2)}\n`) }];
  }
  if (options.to === "csv") {
    const names = pickedSheets(book, options);
    return names.map((sheet) => ({ sheet: names.length > 1 ? sheet : "", bytes: sheetToCsv(book.Sheets[sheet]!, options) }));
  }
  const out = XLSX.write(book, { type: "array", bookType: options.to, compression: true }) as ArrayBuffer;
  return [{ sheet: "", bytes: new Uint8Array(out) }];
}

/** The sheets of a workbook (CSV and JSON give one), for picking which to convert. */
export function listSheets(bytes: Uint8Array, name: string): SheetSummary[] {
  const book = readBook(bytes, name);
  return book.SheetNames.map((sheet) => {
    const rows = rowsOf(book.Sheets[sheet]!);
    let last = -1;
    let columns = 0;
    rows.forEach((row, i) => {
      const width = (row ?? []).reduce((w, cell, j) => (cell && cell.v !== undefined && cell.v !== null && cell.v !== "" ? j + 1 : w), 0);
      if (width > 0) last = i;
      columns = Math.max(columns, width);
    });
    return { name: sheet, rows: last + 1, columns };
  });
}

/** Tables read elsewhere (PDF to Excel) as an XLSX, or one CSV per sheet. */
export type TableWriteOptions = Pick<SheetOptions, "delimiter" | "bom"> & { to: "xlsx" | "csv" };

export function writeTables(sheets: readonly TableSheet[], options: TableWriteOptions): SheetFile[] {
  const book = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(sheet.rows.length ? sheet.rows : [[]], { dense: true }), uniqueSheetName(book, sheet.name));
  }
  if (options.to === "csv") {
    const full: SheetOptions = { ...options, to: "csv", sheets: "all" };
    return book.SheetNames.map((name) => ({ sheet: book.SheetNames.length > 1 ? name : "", bytes: sheetToCsv(book.Sheets[name]!, full) }));
  }
  const out = XLSX.write(book, { type: "array", bookType: "xlsx", compression: true }) as ArrayBuffer;
  return [{ sheet: "", bytes: new Uint8Array(out) }];
}
