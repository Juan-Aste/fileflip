// JSON ↔ TOML with smol-toml. TOML needs a table at the root and has no
// null: null keys are left out, and what can't be written fails with a
// specific message.

import { parse, stringify } from "smol-toml";
import { ConversionError } from "@/lib/convert-error";
import { invalidData, isPlainObject, parseJson, toJsonText, type Json } from "./json";
import { stripBom } from "./text";

const unsupported = () => new ConversionError("tomlUnsupported");

function withoutNulls(value: Json): Json {
  if (Array.isArray(value)) {
    if (value.some((v) => v === null)) throw unsupported();
    return value.map(withoutNulls);
  }
  if (isPlainObject(value)) {
    const out: Record<string, Json> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null) continue;
      Object.defineProperty(out, k, { value: withoutNulls(v), enumerable: true, writable: true, configurable: true });
    }
    return out;
  }
  return value;
}

export function jsonToToml(text: string): string {
  const data = parseJson(text);
  if (!isPlainObject(data)) throw unsupported();
  try {
    return stringify(withoutNulls(data)) + "\n";
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    throw unsupported();
  }
}

export function tomlToJson(text: string): string {
  try {
    // Dates serialize as ISO text (TomlDate.toJSON); integers beyond 2^53 are rejected by the parser.
    return toJsonText(parse(stripBom(text)));
  } catch {
    throw invalidData();
  }
}
