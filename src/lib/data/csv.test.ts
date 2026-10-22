import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { ConversionError } from "@/lib/convert-error";
import { csvToJson, flatten, jsonToCsv, typedValue, unflatten } from "./csv";
import { decodeText } from "./text";

const toCsv = (value: unknown, options: Partial<Parameters<typeof jsonToCsv>[1]> = {}) =>
  jsonToCsv(JSON.stringify(value), { delimiter: ",", bom: false, flatten: true, ...options });
const toJson = (text: string, options: Partial<Parameters<typeof csvToJson>[1]> = {}) =>
  JSON.parse(csvToJson(text, { delimiter: "", typed: true, nested: true, ...options }));
// Independent reader for the produced CSV.
const rows = (csv: string, delimiter = ",") => Papa.parse<string[]>(csv.replace(/^﻿/, ""), { delimiter, skipEmptyLines: true }).data;

const invalidData = expect.objectContaining({ code: "invalidData" });

describe("jsonToCsv", () => {
  it("writes one row per record with the union of keys as header", () => {
    const csv = toCsv([{ a: 1, b: "x" }, { b: "y", c: true }]);
    expect(rows(csv)).toEqual([
      ["a", "b", "c"],
      ["1", "x", ""],
      ["", "y", "true"],
    ]);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("quotes delimiters, quotes and line breaks", () => {
    const csv = toCsv([{ text: 'say "hi", then\nleave' }]);
    expect(csv).toContain('"say ""hi"", then\nleave"');
    expect(rows(csv)[1]).toEqual(['say "hi", then\nleave']);
  });

  it("flattens nested objects and arrays into dotted columns", () => {
    const csv = toCsv([{ id: 1, address: { city: "Lima", geo: { lat: -12 } }, tags: ["a", "b"], empty: {} }]);
    expect(rows(csv)).toEqual([
      ["id", "address.city", "address.geo.lat", "tags.0", "tags.1", "empty"],
      ["1", "Lima", "-12", "a", "b", "{}"],
    ]);
  });

  it("leaves out an empty list column when other records have items", () => {
    // (the second record's lone empty cell is an empty line, skipped by the reader)
    expect(rows(toCsv([{ tags: ["a"] }, { tags: [] }]))).toEqual([["tags.0"], ["a"]]);
    expect(rows(toCsv([{ tags: 1 }, { tags: [] }, { tags: ["a"] }]))[0]).toEqual(["tags", "tags.0"]);
  });

  it("writes nested values as JSON text when flattening is off", () => {
    expect(rows(toCsv([{ a: { b: 1 }, c: [1, 2] }], { flatten: false }))[1]).toEqual(['{"b":1}', "[1,2]"]);
  });

  it("uses semicolons or tabs and an optional BOM", () => {
    expect(rows(toCsv([{ a: "1,5", b: 2 }], { delimiter: ";" }), ";")).toEqual([["a", "b"], ["1,5", "2"]]);
    const tsv = toCsv([{ a: 1, b: 2 }], { delimiter: "\t", bom: true });
    expect(tsv.startsWith("﻿a\tb\r\n")).toBe(true);
  });

  it("accepts one object, a wrapper with one array, primitives and rows", () => {
    expect(rows(toCsv({ a: 1 }))).toEqual([["a"], ["1"]]);
    expect(rows(toCsv({ items: [{ a: 1 }, { a: 2 }] }))).toEqual([["a"], ["1"], ["2"]]);
    // A lone empty cell is an empty line, which CSV readers skip.
    expect(toCsv([1, "two", null])).toBe("value\r\n1\r\ntwo\r\n\r\n");
    expect(rows(toCsv([["h1", "h2"], [1, 2]]))).toEqual([["h1", "h2"], ["1", "2"]]);
  });

  it("rejects invalid or empty JSON with invalidData", () => {
    expect(() => jsonToCsv('[{"a": 1,}]', { delimiter: ",", bom: false, flatten: true })).toThrow(ConversionError);
    expect(() => jsonToCsv("[{", { delimiter: ",", bom: false, flatten: true })).toThrow(invalidData);
    expect(() => toCsv([])).toThrow(invalidData);
  });

  it("stops at absurd nesting or column counts", () => {
    let deep: unknown = 1;
    for (let i = 0; i < 40; i++) deep = { x: deep };
    expect(() => toCsv([deep])).toThrow(invalidData);
    const wide = Object.fromEntries(Array.from({ length: 6000 }, (_, i) => [`k${i}`, i]));
    expect(() => toCsv([wide])).toThrow(invalidData);
  });

  it("reads JSON text with a BOM", () => {
    expect(rows(jsonToCsv('﻿[{"a":1}]', { delimiter: ",", bom: false, flatten: true }))).toEqual([["a"], ["1"]]);
  });
});

describe("csvToJson", () => {
  it("detects comma, semicolon and tab delimiters", () => {
    const expected = [{ name: "Ana", qty: 2 }];
    expect(toJson("name,qty\nAna,2\n")).toEqual(expected);
    expect(toJson("name;qty\r\nAna;2\r\n")).toEqual(expected);
    expect(toJson("name\tqty\nAna\t2")).toEqual(expected);
  });

  it("keeps quoted delimiters and line breaks", () => {
    expect(toJson('name,note\n"Pérez, Ana","line 1\nline 2"\n')).toEqual([{ name: "Pérez, Ana", note: "line 1\nline 2" }]);
  });

  it("types numbers, booleans and empty cells only when they read back exactly", () => {
    expect(toJson("a,b,c,d,e,f\n1.5,true,,007,12345678901234567890,-3e2\n")).toEqual([
      { a: 1.5, b: true, c: null, d: "007", e: "12345678901234567890", f: -300 },
    ]);
    expect(toJson("a,b\n1,true\n", { typed: false })).toEqual([{ a: "1", b: "true" }]);
  });

  it("rebuilds nested objects and arrays from dotted columns", () => {
    expect(toJson("id,address.city,tags.0,tags.1\n1,Lima,a,b\n")).toEqual([{ id: 1, address: { city: "Lima" }, tags: ["a", "b"] }]);
    expect(toJson("address.city\nLima\n", { nested: false })).toEqual([{ "address.city": "Lima" }]);
  });

  it("names empty and repeated headers, and pads short rows", () => {
    expect(toJson("a,,a\n1,2,3\n4\n")).toEqual([
      { a: 1, column2: 2, a_2: 3 },
      { a: 4, column2: null, a_2: null },
    ]);
  });

  it("rejects broken quoting and files without a header", () => {
    expect(() => csvToJson('a,b\n"open,1\n', { delimiter: "", typed: true, nested: true })).toThrow(invalidData);
    expect(() => csvToJson("", { delimiter: "", typed: true, nested: true })).toThrow(invalidData);
  });

  it("round-trips nested JSON through CSV", () => {
    const data = [
      { id: 1, user: { name: "Zoë", langs: ["es", "pt"] }, active: true, score: 9.5, note: 'a "quote", here' },
      { id: 2, user: { name: "李", langs: ["zh"] }, active: false, score: null, note: "" },
    ];
    const back = toJson(toCsv(data, { bom: true }));
    expect(back).toEqual([
      { ...data[0] },
      { id: 2, user: { name: "李", langs: ["zh"] }, active: false, score: null, note: null },
    ]);
  });
});

describe("unflatten", () => {
  it("keeps clashing and unsafe columns flat without polluting prototypes", () => {
    const result = unflatten([
      ["a", 1],
      ["a.b", 2],
      ["__proto__.polluted", 3],
      ["x.constructor", 4],
      ["list.0", 5],
      ["list.name", 6],
    ]);
    expect(result).toEqual({ a: 1, "a.b": 2, "__proto__.polluted": 3, "x.constructor": 4, list: [5], "list.name": 6 });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });

  it("keeps a column literally named __proto__ as data", () => {
    const result = unflatten([["__proto__", 1]]);
    expect(Object.keys(result)).toEqual(["__proto__"]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(JSON.parse('{"__proto__":1}'));
  });
});

describe("helpers", () => {
  it("flatten names primitives 'value'", () => {
    expect([...flatten(5)]).toEqual([["value", "5"]]);
  });

  it("typedValue", () => {
    expect(typedValue("0")).toBe(0);
    expect(typedValue("1e999")).toBe("1e999");
    expect(typedValue("TRUE")).toBe("TRUE");
  });

  it("decodeText handles BOMs, UTF-8 and Windows-1252", () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x61]))).toBe("a");
    expect(decodeText(new TextEncoder().encode("ñandú"))).toBe("ñandú");
    expect(decodeText(new Uint8Array([0x6e, 0xf1, 0x61]))).toBe("nña");
    expect(decodeText(new Uint8Array([0xff, 0xfe, 0x61, 0x00]))).toBe("a");
  });
});
