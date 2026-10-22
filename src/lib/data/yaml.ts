// JSON ↔ YAML with the `yaml` package. Reading is protected against alias
// bombs ("billion laughs"); writing quotes strings that YAML 1.1 readers
// (docker-compose, older libraries) would take as booleans, numbers or dates.

import YAML, { type Scalar } from "yaml";
import { ConversionError } from "@/lib/convert-error";
import { invalidData, parseJson, toJsonText } from "./json";
import { stripBom } from "./text";

const MAX_ALIASES = 100;
/** Values (after resolving aliases) a document may expand to. */
const MAX_NODES = 2_000_000;
const MAX_DEPTH = 200;

/** Strings a YAML 1.1 reader would not read back as the same string. */
function readsDifferentlyIn11(value: string): boolean {
  if (value.length > 64 || value.includes("\n")) return false;
  try {
    return YAML.parse(value, { version: "1.1" }) !== value;
  } catch {
    return false; // Not a plain scalar: the writer quotes it anyway.
  }
}

export function jsonToYaml(text: string): string {
  const doc = new YAML.Document(parseJson(text));
  YAML.visit(doc, {
    Scalar(_, node: Scalar) {
      if (typeof node.value === "string" && readsDifferentlyIn11(node.value)) node.type = "QUOTE_DOUBLE";
    },
  });
  return doc.toString({ lineWidth: 0 });
}

/**
 * Plain JSON data from what the YAML reader returns: sets become lists,
 * maps objects, binary base64 and dates ISO text. Counts every value, so a
 * document built from many references can't blow up the output.
 */
function toJsonValue(value: unknown, budget: { nodes: number }, depth = 0): unknown {
  if (++budget.nodes > MAX_NODES || depth > MAX_DEPTH) throw invalidData();
  if (value === null || typeof value !== "object") {
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "number" && !Number.isFinite(value)) return String(value);
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) {
    let binary = "";
    for (let i = 0; i < value.length; i += 0x8000) binary += String.fromCharCode(...value.subarray(i, i + 0x8000));
    return btoa(binary);
  }
  if (value instanceof Set || Array.isArray(value)) return [...value].map((v) => toJsonValue(v, budget, depth + 1));
  const entries = value instanceof Map ? [...value.entries()] : Object.entries(value);
  const out: Record<string, unknown> = {};
  for (const [k, v] of entries) {
    // defineProperty keeps a "__proto__" key as data instead of a prototype.
    Object.defineProperty(out, String(k), { value: toJsonValue(v, budget, depth + 1), enumerable: true, writable: true, configurable: true });
  }
  return out;
}

/** YAML (one or several documents separated by ---) to JSON; several become a list. */
export function yamlToJson(text: string): string {
  let docs;
  try {
    docs = YAML.parseAllDocuments(stripBom(text), { merge: true, uniqueKeys: true, prettyErrors: false });
  } catch {
    throw invalidData();
  }
  const list = Array.isArray(docs) ? docs : [docs];
  if (list.length === 0 || list.some((d) => d.errors.length > 0)) throw invalidData();
  const budget = { nodes: 0 };
  try {
    const values = list.map((d) => toJsonValue(d.toJS({ maxAliasCount: MAX_ALIASES }), budget));
    return toJsonText(values.length === 1 ? values[0] : values);
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    throw invalidData(); // Alias limit and other resolution errors.
  }
}
