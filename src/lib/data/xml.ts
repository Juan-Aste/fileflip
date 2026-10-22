// JSON ↔ XML with fast-xml-parser. XML is read without DTD entities: a
// document that declares any (<!ENTITY>, the door to XXE and "billion
// laughs") is refused before parsing. Attributes become "@name" keys and
// mixed text "#text", the usual convention, so the way back rebuilds them.

import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";
import { ConversionError } from "@/lib/convert-error";
import { invalidData, isPlainObject, parseJson, toJsonText, type Json } from "./json";
import { stripBom } from "./text";

const ATTRIBUTE = "@";
const TEXT = "#text";
const MAX_DEPTH = 200;

export function xmlToJson(text: string): string {
  const xml = stripBom(text);
  if (/<!ENTITY/i.test(xml)) throw new ConversionError("xmlEntitiesBlocked");
  if (XMLValidator.validate(xml) !== true) throw invalidData();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ATTRIBUTE,
    textNodeName: TEXT,
    // XML has no types: values stay text ("007" keeps its zeros).
    parseTagValue: false,
    parseAttributeValue: false,
    // Predefined and numeric references (&amp; &#233;); DTD entities were refused above.
    processEntities: true,
    htmlEntities: true,
    ignoreDeclaration: true,
    ignorePiTags: true,
    trimValues: true,
  });
  try {
    return toJsonText(parser.parse(xml));
  } catch {
    // Includes names like <__proto__>, which the parser refuses.
    throw invalidData();
  }
}

/** A valid XML element name from any JSON key: "bad key" → "bad_key", "1st" → "_1st". */
export function elementName(key: string): string {
  let name = key.replace(/[^\p{L}\p{N}_.-]/gu, "_");
  if (!/^[\p{L}_]/u.test(name)) name = `_${name}`;
  if (/^xml/i.test(name)) name = `_${name}`;
  return name;
}

function sanitize(value: Json, depth = 0): Json {
  if (depth > MAX_DEPTH) throw invalidData();
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  if (!isPlainObject(value)) return value;
  const out: Record<string, Json> = {};
  for (const [key, child] of Object.entries(value)) {
    const name =
      key === TEXT ? key : key.startsWith(ATTRIBUTE) ? ATTRIBUTE + elementName(key.slice(ATTRIBUTE.length)) : elementName(key);
    // Two keys that end up with the same name: the second one keeps a suffix.
    let unique = name;
    for (let n = 2; Object.hasOwn(out, unique); n++) unique = `${name}_${n}`;
    // defineProperty keeps "__proto__" as a key instead of a prototype.
    Object.defineProperty(out, unique, { value: sanitize(child, depth + 1), enumerable: true, writable: true, configurable: true });
  }
  return out;
}

/**
 * JSON to an indented XML document. An object with a single key uses it as
 * the root element; anything else goes inside <root>, and list items of a
 * top-level array become <item> elements.
 */
export function jsonToXml(text: string): string {
  const data = parseJson(text);
  let doc: Json;
  if (isPlainObject(data) && Object.keys(data).length === 1 && !Object.keys(data)[0]!.startsWith(ATTRIBUTE)) doc = data;
  else doc = { root: Array.isArray(data) ? { item: data } : data };
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: ATTRIBUTE,
    textNodeName: TEXT,
    format: true,
    indentBy: "  ",
    suppressEmptyNode: true,
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(sanitize(doc))}`;
}
