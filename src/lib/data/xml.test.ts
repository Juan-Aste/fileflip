import { XMLParser, XMLValidator } from "fast-xml-parser";
import { describe, expect, it } from "vitest";
import { elementName, jsonToXml, xmlToJson } from "./xml";

const invalidData = expect.objectContaining({ code: "invalidData" });
const blocked = expect.objectContaining({ code: "xmlEntitiesBlocked" });
const toJson = (xml: string) => JSON.parse(xmlToJson(xml));

describe("xmlToJson", () => {
  it("maps elements, attributes, repeated elements, CDATA and references", () => {
    const out = toJson('<?xml version="1.0"?>\n<shop id="7"><item sku="A1"><name>Café &amp; té</name><price>007</price></item><item sku="B2"><name>&#233;</name></item><note><![CDATA[<raw>]]></note><empty/></shop>');
    expect(out).toEqual({
      shop: {
        "@id": "7",
        item: [
          { "@sku": "A1", name: "Café & té", price: "007" },
          { "@sku": "B2", name: "é" },
        ],
        note: "<raw>",
        empty: "",
      },
    });
  });

  it("refuses DTD entities: external (XXE) and nested (billion laughs)", () => {
    expect(() => xmlToJson('<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><r>&x;</r>')).toThrow(blocked);
    const lol = '<!DOCTYPE l [<!ENTITY a "lol"><!entity b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">]><l>&b;</l>';
    expect(() => xmlToJson(lol)).toThrow(blocked);
  });

  it("refuses malformed XML and prototype-polluting names", () => {
    expect(() => xmlToJson("<a><b></a>")).toThrow(invalidData);
    expect(() => xmlToJson("not xml")).toThrow(invalidData);
    expect(() => xmlToJson("<a><__proto__><polluted>1</polluted></__proto__></a>")).toThrow(invalidData);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("jsonToXml", () => {
  const parse = (xml: string) =>
    new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", parseTagValue: false, parseAttributeValue: false, ignoreDeclaration: true }).parse(xml);

  it("uses a single key as the root and escapes text and attributes", () => {
    const xml = jsonToXml(JSON.stringify({ shop: { "@id": 7, item: [{ name: 'a & <b> "c"' }, { name: "d" }], empty: null } }));
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<shop id="7">')).toBe(true);
    expect(XMLValidator.validate(xml)).toBe(true);
    expect(parse(xml)).toEqual({ shop: { "@id": "7", item: [{ name: 'a & <b> "c"' }, { name: "d" }], empty: "" } });
  });

  it("wraps lists and multi-key objects in <root>", () => {
    expect(parse(jsonToXml("[1, 2]"))).toEqual({ root: { item: ["1", "2"] } });
    expect(parse(jsonToXml('{"a": 1, "b": 2}'))).toEqual({ root: { a: "1", b: "2" } });
  });

  it("turns any key into a valid element name", () => {
    expect(elementName("bad key")).toBe("bad_key");
    expect(elementName("1st")).toBe("_1st");
    expect(elementName("xmlThing")).toBe("_xmlThing");
    expect(elementName("ñandú")).toBe("ñandú");
    const xml = jsonToXml(JSON.stringify({ r: { "bad key": 1, "bad?key": 2, "<x>": 3, __proto__x: 4 } }));
    expect(XMLValidator.validate(xml)).toBe(true);
    expect(parse(xml)).toEqual({ r: { bad_key: "1", bad_key_2: "2", "_x_": "3", __proto__x: "4" } });
  });

  it("round-trips through xmlToJson", () => {
    const data = { catalog: { "@lang": "es", book: [{ "@id": "1", title: "Rayuela" }, { "@id": "2", title: "Ficciones" }] } };
    expect(toJson(jsonToXml(JSON.stringify(data)))).toEqual(data);
  });

  it("rejects invalid JSON", () => {
    expect(() => jsonToXml("{")).toThrow(invalidData);
  });
});
