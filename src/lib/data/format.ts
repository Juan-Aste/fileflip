// Formatters/validators for JSON, XML and YAML. They never throw for bad
// input: they return where the first error is (line and column, 1-based),
// because "line 12, column 5" is what the user needs to fix the file.

import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";
import YAML from "yaml";
import type { ApiErrorCode } from "@/lib/api-errors";
import { stripBom } from "./text";

export type Indent = 2 | 4 | "tab";

export type FormatResult =
  | { ok: true; text: string }
  | { ok: false; code: ApiErrorCode; line?: number; column?: number };

const indentText = (indent: Indent) => (indent === "tab" ? "\t" : " ".repeat(indent));

/** 1-based line and column of a string offset. */
export function positionAt(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let start = 0;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      start = i + 1;
    }
  }
  return { line, column: Math.min(offset, text.length) - start + 1 };
}

/**
 * Offset of the first JSON syntax error, or -1 when the text is valid.
 * Browsers word (and sometimes omit) positions differently in JSON.parse
 * errors, so this small scanner finds it the same way everywhere.
 */
export function jsonErrorOffset(text: string): number {
  let i = 0;
  const ws = () => {
    while (i < text.length && " \t\n\r".includes(text[i]!)) i++;
  };
  const fail = (): never => {
    throw i;
  };
  const literal = (word: string) => {
    for (const c of word) {
      if (text[i] !== c) fail();
      i++;
    }
  };
  const string = () => {
    i++; // opening quote
    while (i < text.length) {
      const c = text.charCodeAt(i);
      if (c === 0x22) return void i++;
      if (c < 0x20) fail();
      if (c === 0x5c) {
        i++;
        const e = text[i];
        if (e === "u") {
          for (let k = 1; k <= 4; k++) {
            if (!/[0-9a-fA-F]/.test(text[i + k] ?? "")) {
              i += k;
              fail();
            }
          }
          i += 5;
        } else if (e !== undefined && '"\\/bfnrt'.includes(e)) i++;
        else fail();
      } else i++;
    }
    fail();
  };
  const number = () => {
    const match = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i, i + 400));
    if (!match || match[0] === "-") fail();
    i += match![0].length;
  };
  const value = (depth: number): void => {
    if (depth > 2_000) fail();
    ws();
    const c = text[i];
    if (c === "{") {
      i++;
      ws();
      if (text[i] === "}") return void i++;
      for (;;) {
        ws();
        if (text[i] !== '"') fail();
        string();
        ws();
        if (text[i] !== ":") fail();
        i++;
        value(depth + 1);
        ws();
        if (text[i] === ",") i++;
        else if (text[i] === "}") return void i++;
        else fail();
      }
    } else if (c === "[") {
      i++;
      ws();
      if (text[i] === "]") return void i++;
      for (;;) {
        value(depth + 1);
        ws();
        if (text[i] === ",") i++;
        else if (text[i] === "]") return void i++;
        else fail();
      }
    } else if (c === '"') string();
    else if (c === "t") literal("true");
    else if (c === "f") literal("false");
    else if (c === "n") literal("null");
    else if (c === "-" || (c !== undefined && c >= "0" && c <= "9")) number();
    else fail();
  };
  try {
    value(0);
    ws();
    if (i < text.length) fail();
    return -1;
  } catch (offset) {
    if (typeof offset !== "number") throw offset;
    return offset;
  }
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    Object.defineProperty(out, key, {
      value: sortKeys((value as Record<string, unknown>)[key]),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return out;
}

export interface JsonFormatOptions {
  /** null = minify. */
  indent: Indent | null;
  sortKeys: boolean;
}

export function formatJson(input: string, options: JsonFormatOptions): FormatResult {
  const text = stripBom(input);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    const offset = jsonErrorOffset(text);
    return { ok: false, code: "invalidData", ...(offset >= 0 ? positionAt(text, offset) : {}) };
  }
  if (options.sortKeys) data = sortKeys(data);
  const out = options.indent === null ? JSON.stringify(data) : JSON.stringify(data, null, indentText(options.indent));
  return { ok: true, text: out + "\n" };
}

export interface XmlFormatOptions {
  indent: Indent | null;
}

export function formatXml(input: string, options: XmlFormatOptions): FormatResult {
  const xml = stripBom(input);
  if (/<!ENTITY/i.test(xml)) return { ok: false, code: "xmlEntitiesBlocked" };
  const valid = XMLValidator.validate(xml);
  if (valid !== true) return { ok: false, code: "invalidData", line: valid.err.line, column: valid.err.col };
  const shared = {
    ignoreAttributes: false,
    preserveOrder: true,
    commentPropName: "#comment",
    cdataPropName: "#cdata",
    // Keep text, attributes and references exactly as written.
    parseTagValue: false,
    parseAttributeValue: false,
    processEntities: false,
  };
  try {
    const tree = new XMLParser({ ...shared, trimValues: true }).parse(xml);
    const body = new XMLBuilder({
      ...shared,
      format: options.indent !== null,
      indentBy: options.indent === null ? "" : indentText(options.indent),
      suppressEmptyNode: true,
      suppressBooleanAttributes: false,
    }).build(tree) as string;
    // The builder breaks the line after a CDATA section, which would add
    // whitespace to the element's text: keep the closing tag next to it.
    return { ok: true, text: body.replace(/\]\]>\n[ \t]*<\//g, "]]></").trim() + "\n" };
  } catch {
    return { ok: false, code: "invalidData" };
  }
}

export interface YamlFormatOptions {
  indent: 2 | 4;
}

/** Reformats YAML keeping comments, anchors and every document. */
export function formatYaml(input: string, options: YamlFormatOptions): FormatResult {
  const docs = YAML.parseAllDocuments(stripBom(input), { uniqueKeys: true, prettyErrors: true });
  const list = Array.isArray(docs) ? docs : [docs];
  for (const doc of list) {
    const error = doc.errors[0];
    if (error) {
      const pos = error.linePos?.[0];
      return { ok: false, code: "invalidData", ...(pos ? { line: pos.line, column: pos.col } : {}) };
    }
  }
  if (list.length === 0) return { ok: false, code: "invalidData" };
  const text = list
    .map((doc, i) => {
      const body = doc.toString({ indent: options.indent, lineWidth: 0 });
      // The first document needs no separator unless it had directives.
      return i === 0 || body.startsWith("---") ? body : `---\n${body}`;
    })
    .join("");
  return { ok: true, text };
}
