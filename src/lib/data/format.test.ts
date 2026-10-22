import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { formatJson, formatXml, formatYaml, jsonErrorOffset, positionAt } from "./format";

describe("jsonErrorOffset", () => {
  it.each([
    ['{"a": 1,}', 8],
    ['{"a" 1}', 5],
    ["[1, 2", 5],
    ['{"a": tru}', 9],
    ['"bad \\x escape"', 6],
    ["[01]", 2],
    ["[1] x", 4],
    ["", 0],
    ['{"a": "line\nbreak"}', 11],
  ])("%j fails at %i", (text, offset) => {
    expect(jsonErrorOffset(text)).toBe(offset);
    expect(() => JSON.parse(text)).toThrow();
  });

  it.each(['{"a": [1, -2.5e3, true, false, null, "\\u00e9\\n"]}', " [] ", '"x"', "0"])("%j is valid", (text) => {
    expect(jsonErrorOffset(text)).toBe(-1);
  });
});

describe("positionAt", () => {
  it("counts lines and columns from 1", () => {
    expect(positionAt("ab\ncd", 0)).toEqual({ line: 1, column: 1 });
    expect(positionAt("ab\ncd", 4)).toEqual({ line: 2, column: 2 });
  });
});

describe("formatJson", () => {
  const src = '{"b": [1, {"c": null}], "a": "é"}';
  it("indents with 2, 4 or tabs, and minifies", () => {
    expect(formatJson(src, { indent: 2, sortKeys: false })).toEqual({ ok: true, text: '{\n  "b": [\n    1,\n    {\n      "c": null\n    }\n  ],\n  "a": "é"\n}\n' });
    expect((formatJson(src, { indent: 4, sortKeys: false }) as { text: string }).text).toContain('\n    "b": [');
    expect((formatJson(src, { indent: "tab", sortKeys: false }) as { text: string }).text).toContain('\n\t"b": [');
    expect(formatJson(src, { indent: null, sortKeys: false })).toEqual({ ok: true, text: '{"b":[1,{"c":null}],"a":"é"}\n' });
  });

  it("sorts keys recursively, keeping __proto__ as data", () => {
    expect(formatJson('{"b": 1, "a": {"z": 1, "y": 2}, "__proto__": 0}', { indent: null, sortKeys: true })).toEqual({
      ok: true,
      text: '{"__proto__":0,"a":{"y":2,"z":1},"b":1}\n',
    });
  });

  it("reports the line and column of the first error", () => {
    expect(formatJson('{\n  "a": 1,\n  "b": 2,\n}', { indent: 2, sortKeys: false })).toEqual({ ok: false, code: "invalidData", line: 4, column: 1 });
  });
});

describe("formatXml", () => {
  it("indents, keeps comments, CDATA, attributes and references, and minifies", () => {
    const xml = '<a x="1"><!-- note --><b>Café &amp; té</b><c><![CDATA[<raw>]]></c><d/></a>';
    const pretty = formatXml(xml, { indent: 2 });
    expect(pretty).toEqual({ ok: true, text: '<a x="1">\n  <!-- note -->\n  <b>Café &amp; té</b>\n  <c><![CDATA[<raw>]]></c>\n  <d/>\n</a>\n' });
    expect(formatXml((pretty as { text: string }).text, { indent: null })).toEqual({
      ok: true,
      text: '<a x="1"><!-- note --><b>Café &amp; té</b><c><![CDATA[<raw>]]></c><d/></a>\n',
    });
  });

  it("reports errors with their position and refuses entities", () => {
    expect(formatXml("<a>\n  <b>\n</a>", { indent: 2 })).toMatchObject({ ok: false, code: "invalidData", line: 3 });
    expect(formatXml('<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><r>&x;</r>', { indent: 2 })).toEqual({ ok: false, code: "xmlEntitiesBlocked" });
  });
});

describe("formatYaml", () => {
  it("re-indents keeping comments, anchors and every document", () => {
    const src = "# top\nbase: &b\n    x: 1   # inline\nlist:\n- a\n- b\nitem: *b\n---\nsecond: true\n";
    const out = formatYaml(src, { indent: 2 });
    expect(out.ok).toBe(true);
    const text = (out as { text: string }).text;
    expect(text).toContain("# top\n");
    expect(text).toContain("x: 1 # inline");
    expect(text).toContain("  - a\n");
    expect(YAML.parseAllDocuments(text).map((d) => d.toJS())).toEqual([{ base: { x: 1 }, list: ["a", "b"], item: { x: 1 } }, { second: true }]);
  });

  it("reports the position of syntax errors and duplicate keys", () => {
    expect(formatYaml("a: 1\nb: [1, 2\nc: 3\n", { indent: 2 })).toMatchObject({ ok: false, code: "invalidData", line: expect.any(Number) });
    expect(formatYaml("a: 1\na: 2\n", { indent: 2 })).toMatchObject({ ok: false, code: "invalidData", line: 2, column: 1 });
  });
});
