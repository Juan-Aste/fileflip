// JSON ↔ CSV/TSV. Nested objects become columns with dotted names
// ("address.city", "tags.0") and CSV → JSON can rebuild them, so a file
// survives the round trip. Pure functions: they run in the data worker and
// in unit tests.

import Papa from "papaparse";
import { ConversionError } from "@/lib/convert-error";
import { stripBom } from "./text";

export type Delimiter = "," | ";" | "\t";

/** Limits that keep a malformed or hostile file from freezing the tab. */
export const MAX_COLUMNS = 5_000;
const MAX_DEPTH = 32;
const MAX_ARRAY_INDEX = 10_000;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const invalid = () => new ConversionError("invalidData");

function isPlainObject(value: unknown): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** One record as flat `column → cell` pairs, in key order. */
export function flatten(value: Json, prefix = "", out = new Map<string, string>(), depth = 0): Map<string, string> {
  if (depth > MAX_DEPTH) throw invalid();
  const isContainer = Array.isArray(value) || isPlainObject(value);
  const entries: [string, Json][] = Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : isPlainObject(value)
      ? Object.entries(value)
      : [];
  if (!isContainer || entries.length === 0) {
    // Primitives, and empty containers written as JSON so they are not lost.
    out.set(prefix || "value", cell(value));
    return out;
  }
  for (const [key, child] of entries) flatten(child, prefix ? `${prefix}.${key}` : key, out, depth + 1);
  return out;
}

function cell(value: Json): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export interface JsonToCsvOptions {
  delimiter: Delimiter;
  /** Writes a UTF-8 byte order mark so Excel shows accents correctly. */
  bom: boolean;
  /** Nested objects as dotted columns; otherwise they are written as JSON text. */
  flatten: boolean;
}

/** Converts JSON text (an array of records, one record, or an array of arrays) to CSV text. */
export function jsonToCsv(text: string, options: JsonToCsvOptions): string {
  let data: Json;
  try {
    data = JSON.parse(stripBom(text));
  } catch {
    throw invalid();
  }
  // A wrapper like {"items": [...]} with a single array inside: use the array.
  if (isPlainObject(data)) {
    const values = Object.values(data);
    data = values.length === 1 && Array.isArray(values[0]) ? values[0] : [data];
  }
  if (!Array.isArray(data)) data = [data];
  if (data.length === 0) throw invalid();

  const config = { delimiter: options.delimiter, newline: "\r\n", quotes: false };
  let csv: string;
  if (data.every(Array.isArray)) {
    // Rows already: written as they are, without a header.
    csv = Papa.unparse((data as Json[][]).map((row) => row.map(cell)), config);
  } else {
    const records = data.map((row) =>
      options.flatten ? flatten(row) : new Map(isPlainObject(row) ? Object.entries(row).map(([k, v]) => [k, cell(v)]) : [["value", cell(row)]]),
    );
    const columns: string[] = [];
    const seen = new Set<string>();
    for (const record of records) {
      for (const key of record.keys()) {
        if (seen.has(key)) continue;
        seen.add(key);
        columns.push(key);
        if (columns.length > MAX_COLUMNS) throw invalid();
      }
    }
    // An empty list or object where other records have items ("tags": [] next
    // to "tags.0") would block rebuilding them from CSV: leave that column out.
    const kept = columns.filter(
      (c) =>
        !columns.some((other) => other.startsWith(`${c}.`)) ||
        records.some((r) => !["", "[]", "{}"].includes(r.get(c) ?? "")),
    );
    csv = Papa.unparse({ fields: kept, data: records.map((r) => kept.map((c) => r.get(c) ?? "")) }, config);
  }
  return (options.bom ? "﻿" : "") + csv + "\r\n";
}

export interface CsvToJsonOptions {
  /** Empty = detect among comma, semicolon, tab and pipe. */
  delimiter: Delimiter | "";
  /** Numbers, true/false and empty cells (null) instead of strings everywhere. */
  typed: boolean;
  /** Rebuilds nested objects and arrays from dotted column names. */
  nested: boolean;
}

const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;

/** Only values that read back exactly: "007" and huge integers stay text. */
export function typedValue(raw: string): Json {
  if (raw === "") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (NUMBER.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n) && (!Number.isInteger(n) || Number.isSafeInteger(n))) return n;
  }
  return raw;
}

/** Converts CSV/TSV text with a header row to a JSON array of records. */
export function csvToJson(text: string, options: CsvToJsonOptions): string {
  const parsed = Papa.parse<string[]>(stripBom(text), {
    delimiter: options.delimiter,
    delimitersToGuess: [",", ";", "\t", "|"],
    skipEmptyLines: "greedy",
  });
  // Rows with a different cell count are kept (padded or cut to the header);
  // broken quoting is not, because the cells after it would be wrong.
  if (parsed.errors.some((e) => e.type === "Quotes")) throw invalid();
  const [header, ...rows] = parsed.data;
  if (!header || header.length === 0 || header.length > MAX_COLUMNS) throw invalid();
  const columns = uniqueColumns(header);
  const records = rows.map((row) => {
    const pairs = columns.map((column, i): [string, Json] => {
      const raw = row[i] ?? "";
      return [column, options.typed ? typedValue(raw) : raw];
    });
    if (!options.nested) return Object.fromEntries(pairs);
    // A shorter list in this row ("tags.1" empty): no trailing nulls.
    return unflatten(pairs.filter(([column], i) => (row[i] ?? "") !== "" || !isListItem(column)));
  });
  return JSON.stringify(records, null, 2) + "\n";
}

/** Empty and repeated header cells get a name of their own: "", "a", "a" → "column1", "a", "a_2". */
function uniqueColumns(header: string[]): string[] {
  const used = new Set<string>();
  return header.map((name, i) => {
    let column = name.trim() || `column${i + 1}`;
    for (let n = 2; used.has(column); n++) column = `${name.trim() || `column${i + 1}`}_${n}`;
    used.add(column);
    return column;
  });
}

const INDEX = /^(0|[1-9]\d*)$/;
const isListItem = (column: string) => column.includes(".") && INDEX.test(column.slice(column.lastIndexOf(".") + 1));
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Rebuilds `{"a.b": 1, "a.c.0": 2}` into `{"a": {"b": 1, "c": [2]}}`. A
 * column that clashes with another (a value at "a" and "a.b", an index next
 * to a name) or names an unsafe key is kept flat, so nothing is lost or
 * polluted.
 */
export function unflatten(pairs: [string, Json][]): Record<string, Json> {
  const root: Record<string, Json> = {};
  const columns = new Set(pairs.map(([column]) => column));
  // "a" and "a.b" can't both be rebuilt: when a prefix is a column itself, stay flat.
  const prefixIsColumn = (path: string[]) => path.slice(1).some((_, i) => columns.has(path.slice(0, i + 1).join(".")));
  for (const [column, value] of pairs) {
    const path = column.split(".");
    if (path.length === 1 || prefixIsColumn(path) || path.some((p) => p === "" || UNSAFE_KEYS.has(p) || (INDEX.test(p) && Number(p) > MAX_ARRAY_INDEX))) {
      setFlat(root, column, value);
      continue;
    }
    let node: Json = root;
    let ok = true;
    for (let i = 0; i < path.length - 1 && ok; i++) {
      const key = path[i]!;
      const container = node as Record<string, Json> | Json[];
      let next = (container as Record<string, Json>)[key];
      if (next === undefined) {
        next = INDEX.test(path[i + 1]!) ? [] : {};
        (container as Record<string, Json>)[key] = next;
      }
      if (typeof next !== "object" || next === null || (Array.isArray(next) && !INDEX.test(path[i + 1]!))) ok = false;
      else node = next;
    }
    const last = path[path.length - 1]!;
    const target = node as Record<string, Json>;
    if (ok && !(Array.isArray(target) && !INDEX.test(last)) && target[last] === undefined) target[last] = value;
    else setFlat(root, column, value);
  }
  return root;
}

function setFlat(root: Record<string, Json>, key: string, value: Json) {
  if (UNSAFE_KEYS.has(key)) Object.defineProperty(root, key, { value, enumerable: true, writable: true, configurable: true });
  else if (root[key] === undefined) root[key] = value;
}
