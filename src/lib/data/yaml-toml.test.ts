import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { jsonToToml, tomlToJson } from "./toml";
import { jsonToYaml, yamlToJson } from "./yaml";

const invalidData = expect.objectContaining({ code: "invalidData" });
const tomlUnsupported = expect.objectContaining({ code: "tomlUnsupported" });
const json = (value: unknown) => JSON.stringify(value);

describe("jsonToYaml", () => {
  it("writes block YAML that reads back as the same data", () => {
    const data = { name: "Zoë", n: 1.5, ok: true, none: null, list: [1, { a: "x" }], empty: [], text: "line 1\nline 2", zh: "中文" };
    const yaml = jsonToYaml(json(data));
    expect(yaml).toContain("name: Zoë\n");
    expect(yaml).toContain("  - a: x\n");
    expect(YAML.parse(yaml)).toEqual(data);
  });

  it("quotes strings that YAML 1.1 readers would change", () => {
    const data = { a: "yes", b: "on", c: "no", d: "0o17", e: "2020-01-01", f: "007", g: "1.0", h: "~", i: "plain" };
    const yaml = jsonToYaml(json(data));
    expect(YAML.parse(yaml, { version: "1.1" })).toEqual(data);
    expect(YAML.parse(yaml, { version: "1.2" })).toEqual(data);
    expect(yaml).toContain("i: plain\n");
  });

  it("keeps long lines unfolded", () => {
    const long = "word ".repeat(60).trim();
    expect(jsonToYaml(json({ long }))).toBe(`long: ${long}\n`);
  });

  it("rejects invalid JSON", () => {
    expect(() => jsonToYaml("{nope}")).toThrow(invalidData);
  });
});

describe("yamlToJson", () => {
  it("converts mappings, lists and scalars with YAML 1.2 types", () => {
    const out = JSON.parse(yamlToJson("name: Ana\nage: 30\nactive: yes\nzip: 007\nwhen: 2001-12-14\ntags: [a, b]\nnested:\n  k: ~\n"));
    expect(out).toEqual({ name: "Ana", age: 30, active: "yes", zip: 7, when: "2001-12-14", tags: ["a", "b"], nested: { k: null } });
  });

  it("joins several documents into a list and resolves merge keys", () => {
    expect(JSON.parse(yamlToJson("a: 1\n---\nb: 2\n"))).toEqual([{ a: 1 }, { b: 2 }]);
    expect(JSON.parse(yamlToJson("base: &b {x: 1, y: 2}\nitem:\n  <<: *b\n  y: 3\n"))).toEqual({ base: { x: 1, y: 2 }, item: { x: 1, y: 3 } });
  });

  it("stops alias bombs (billion laughs)", () => {
    const levels = ["a: &a [lol, lol, lol, lol, lol, lol, lol, lol, lol]"];
    for (let i = 1; i < 9; i++) {
      const prev = String.fromCharCode(96 + i);
      const name = String.fromCharCode(97 + i);
      levels.push(`${name}: &${name} [${Array(9).fill(`*${prev}`).join(", ")}]`);
    }
    expect(() => yamlToJson(levels.join("\n"))).toThrow(invalidData);
  });

  it("never runs custom tags and keeps __proto__ as data", () => {
    const out = JSON.parse(yamlToJson("f: !!js/function 'function () { return 1 }'\n__proto__: {polluted: 1}\n"));
    expect(out.f).toBe("function () { return 1 }");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(out)).toEqual(["f", "__proto__"]);
  });

  it("turns binary into base64", () => {
    expect(JSON.parse(yamlToJson("k: !!binary aGVsbG8=\n"))).toEqual({ k: "aGVsbG8=" });
  });

  it("rejects syntax errors, duplicate keys and empty input", () => {
    expect(() => yamlToJson("a: [1, 2\n")).toThrow(invalidData);
    expect(() => yamlToJson("a: 1\na: 2\n")).toThrow(invalidData);
    expect(() => yamlToJson("")).toThrow(invalidData);
  });
});

describe("jsonToToml", () => {
  it("writes tables and arrays of tables that read back as the same data", () => {
    const data = { title: "Demo", owner: { name: "Ana", langs: ["es", "pt"] }, servers: [{ ip: "10.0.0.1" }, { ip: "10.0.0.2" }], "key with space": 1.5 };
    const toml = jsonToToml(json(data));
    expect(toml).toContain("[[servers]]");
    expect(toml).toContain('"key with space" = 1.5');
    expect(JSON.parse(JSON.stringify(parseToml(toml)))).toEqual(data);
  });

  it("leaves null keys out", () => {
    expect(JSON.parse(JSON.stringify(parseToml(jsonToToml(json({ a: 1, b: null, c: { d: null, e: 2 } })))))).toEqual({ a: 1, c: { e: 2 } });
  });

  it("explains what TOML can't hold", () => {
    expect(() => jsonToToml("[1, 2]")).toThrow(tomlUnsupported);
    expect(() => jsonToToml('"text"')).toThrow(tomlUnsupported);
    expect(() => jsonToToml('{"a": [1, null]}')).toThrow(tomlUnsupported);
    expect(() => jsonToToml("{")).toThrow(invalidData);
  });
});

describe("tomlToJson", () => {
  it("converts tables, arrays and dates", () => {
    const out = JSON.parse(tomlToJson('title = "Demo"\n[owner]\nname = "Ana"\ndob = 1979-05-27T07:32:00Z\nday = 1979-05-27\n[[items]]\nn = 1\n[[items]]\nn = 2\n'));
    expect(out).toEqual({ title: "Demo", owner: { name: "Ana", dob: "1979-05-27T07:32:00.000Z", day: "1979-05-27" }, items: [{ n: 1 }, { n: 2 }] });
  });

  it("rejects invalid TOML and integers that would lose precision", () => {
    expect(() => tomlToJson("a = \n")).toThrow(invalidData);
    expect(() => tomlToJson("a = 1\na = 2\n")).toThrow(invalidData);
    expect(() => tomlToJson("big = 9007199254740993\n")).toThrow(invalidData);
  });
});
