// Data tools (JSON ↔ CSV/TSV/YAML/TOML) run like a user would: pick a fixture
// or paste text, download the result and read it back with independent readers
// (the YAML and TOML readers are libraries, but not the app's code paths).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { parse as parseToml } from "smol-toml";
import YAML from "yaml";
import { expect, fileOf, fixturePath, readCsv, readJson, readText, runTool, test, toolAlert, waitForResult } from "./support";

const open = async (page: Page, path: string, files: string[] = []) => {
  await page.goto(path, { waitUntil: "networkidle" });
  if (files.length) await page.locator('input[type="file"]').first().setInputFiles(files.map(fixturePath));
};
const choose = (page: Page, label: string) => page.locator("label").filter({ hasText: label }).first().click();

test.afterEach(({ serverCalls }) => {
  expect(serverCalls, "data tools must not call the server").toEqual([]);
});

test.describe("tool: json-to-csv", () => {
  test("nested JSON file → CSV with dotted columns and a BOM", { tag: "@xb" }, async ({ page }) => {
    await open(page, "/es/json-a-csv", ["data.json"]);
    const out = fileOf(await runTool(page, "Convertir a CSV"));
    expect(out.name).toBe("data.csv");
    expect([...out.buf.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const rows = readCsv(out.buf).filter((r) => r.some(Boolean));
    expect(rows[0]).toEqual(["id", "name", "active", "score", "address.city", "address.zip", "tags.0", "tags.1", "note"]);
    expect(rows[1]).toEqual(["1", "Ana Pérez", "true", "9.5", "Lima", "007", "a", "b", ""]);
    expect(rows[2]![1]).toBe('Zoë "Z", Jr.');
    expect(rows[3]).toEqual(["3", "李雷", "true", "7", "北京", "100000", "", "", "line 1\nline 2"]);
    // The preview shows the same text.
    await expect(page.getByRole("textbox", { name: "Vista previa" })).toHaveValue(/^id,name,active/);
  });

  test("pasted JSON → TSV", async ({ page }) => {
    await open(page, "/es/json-a-csv");
    await page.getByRole("textbox", { name: "O pega tu JSON" }).fill('[{"a": 1, "b": "x\\ty"}, {"a": 2}]');
    await choose(page, "Tabulación (TSV)");
    const out = fileOf(await runTool(page, "Convertir a CSV"));
    expect(out.name).toBe("data.tsv");
    expect(readCsv(out.buf, "\t").filter((r) => r.some(Boolean))).toEqual([["a", "b"], ["1", "x\ty"], ["2", ""]]);
  });

  test("broken JSON shows an error", async ({ page }) => {
    await open(page, "/es/json-a-csv", ["corrupt/broken.json"]);
    const result = await runTool(page, "Convertir a CSV");
    expect(result.error).toContain("No pudimos leer el contenido");
    await expect(toolAlert(page)).toBeVisible();
  });
});

test.describe("tool: csv-to-json", () => {
  test("Excel CSV (semicolons, Windows-1252) → typed JSON", async ({ page }) => {
    await open(page, "/es/csv-a-json", ["table-excel.csv"]);
    const out = fileOf(await runTool(page, "Convertir a JSON"));
    expect(out.name).toBe("table-excel.json");
    expect(readJson(out.buf)).toEqual([
      { nombre: "Cañón", cantidad: 2, precio: "3,25" },
      { nombre: "Açaí", cantidad: 1, precio: "9,50" },
    ]);
  });

  test("TSV and CSV in one batch → one JSON each, plus the ZIP option", async ({ page }) => {
    await open(page, "/es/csv-a-json", ["table.tsv", "table.csv"]);
    await page.getByRole("button", { name: "Convertir a JSON", exact: true }).click();
    const links = page.locator("main a[download]");
    await expect(links).toHaveCount(2);
    await expect(page.getByRole("button", { name: /ZIP/ })).toBeVisible();
    const tsv = fileOf(await waitForResult(page, links.nth(0), toolAlert(page)));
    expect(readJson(tsv.buf)).toEqual([{ name: "alpha", qty: 1 }, { name: "beta", qty: 2 }]);
    const csv = fileOf(await waitForResult(page, links.nth(1), toolAlert(page)));
    expect(readJson(csv.buf)).toEqual([
      { name: "alpha", qty: 1, price: 9.5 },
      { name: "beta, with comma", qty: 2, price: 3.25 },
      { name: "gamma", qty: 3, price: 0 },
    ]);
  });

  test("round trip: the CSV made from data.json reads back as the same records", async ({ page }) => {
    await open(page, "/es/json-a-csv", ["data.json"]);
    const csv = fileOf(await runTool(page, "Convertir a CSV"));
    await open(page, "/es/csv-a-json");
    await page.getByRole("textbox", { name: "O pega tu CSV" }).fill(csv.buf.toString("utf8").replace(/^﻿/, ""));
    const back = readJson(fileOf(await runTool(page, "Convertir a JSON")).buf) as Record<string, unknown>[];
    const original = JSON.parse(readFileSync(fixturePath("data.json"), "utf8")) as Record<string, unknown>[];
    // A key missing from a record comes back as null (its cell is empty) and an
    // empty list has no cell of its own: compare what a table can hold.
    expect(back[0]).toEqual({ ...original[0], note: null });
    expect(back[1]).toEqual({ ...original[1], note: null });
    // CSV has no types: a numeric-looking string ("100000") reads back as a number.
    expect(back[2]).toEqual({ ...original[2], address: { city: "北京", zip: 100000 }, tags: undefined });
  });

  test("broken quoting shows an error", async ({ page }) => {
    await open(page, "/es/csv-a-json", ["corrupt/bad-quotes.csv"]);
    expect((await runTool(page, "Convertir a JSON")).error).toContain("No pudimos leer el contenido");
  });
});

test.describe("tool: json-to-yaml", () => {
  test("JSON file → YAML that reads back the same, with ambiguous strings quoted", async ({ page }) => {
    await open(page, "/es/json-a-yaml", ["data.json"]);
    const out = fileOf(await runTool(page, "Convertir a YAML"));
    expect(out.name).toBe("data.yaml");
    const text = readText(out.buf);
    expect(text).toContain('zip: "007"');
    expect(YAML.parse(text)).toEqual(JSON.parse(readFileSync(fixturePath("data.json"), "utf8")));
  });

  test("broken JSON shows an error", async ({ page }) => {
    await open(page, "/es/json-a-yaml", ["corrupt/broken.json"]);
    expect((await runTool(page, "Convertir a YAML")).error).toContain("No pudimos leer el contenido");
  });
});

test.describe("tool: yaml-to-json", () => {
  test("multi-document YAML with anchors and merge keys → JSON list", async ({ page }) => {
    await open(page, "/es/yaml-a-json", ["config.yaml"]);
    const out = fileOf(await runTool(page, "Convertir a JSON"));
    expect(out.name).toBe("config.json");
    expect(readJson(out.buf)).toEqual([
      {
        defaults: { retries: 3, debug: "no" },
        service: { retries: 3, debug: "no", name: "web", ports: [80, 443], zip: "007" },
      },
      { name: "second document" },
    ]);
  });

  test("an alias bomb is rejected without freezing the page", async ({ page }) => {
    await open(page, "/es/yaml-a-json", ["corrupt/alias-bomb.yaml"]);
    expect((await runTool(page, "Convertir a JSON")).error).toContain("No pudimos leer el contenido");
  });
});

test.describe("tool: json-to-toml", () => {
  test("pasted JSON → TOML with tables, nulls left out", async ({ page }) => {
    await open(page, "/en/json-to-toml");
    await page.getByRole("textbox", { name: "Or paste your JSON" }).fill('{"title": "Demo", "gone": null, "owner": {"name": "Ana"}, "servers": [{"ip": "10.0.0.1"}]}');
    const out = fileOf(await runTool(page, "Convert to TOML"));
    expect(out.name).toBe("data.toml");
    expect(JSON.parse(JSON.stringify(parseToml(readText(out.buf))))).toEqual({ title: "Demo", owner: { name: "Ana" }, servers: [{ ip: "10.0.0.1" }] });
  });

  test("a JSON list explains why TOML can't hold it", async ({ page }) => {
    await open(page, "/es/json-a-toml");
    await page.getByRole("textbox", { name: "O pega tu JSON" }).fill("[1, 2, 3]");
    expect((await runTool(page, "Convertir a TOML")).error).toContain("TOML no puede representar este contenido");
  });
});

test.describe("tool: toml-to-json", () => {
  test("TOML file → JSON with dates as ISO text", async ({ page }) => {
    await open(page, "/es/toml-a-json", ["config.toml"]);
    const out = fileOf(await runTool(page, "Convertir a JSON"));
    expect(readJson(out.buf)).toEqual({
      title: "Fileflect demo",
      owner: { name: "Ana", since: "2024-05-27" },
      servers: [
        { ip: "10.0.0.1", ports: [80, 443] },
        { ip: "10.0.0.2", ports: [8080] },
      ],
    });
  });

  test("broken TOML shows an error", async ({ page }) => {
    await open(page, "/es/toml-a-json", ["corrupt/broken.toml"]);
    expect((await runTool(page, "Convertir a JSON")).error).toContain("No pudimos leer el contenido");
  });
});

/** Parses XML with the browser's own DOMParser (independent of the app's library). */
const domXml = (page: Page, xml: string) =>
  page.evaluate((text) => {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) return null;
    const walk = (el: Element): unknown => ({
      name: el.tagName,
      attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])),
      children: el.children.length ? [...el.children].map(walk) : el.textContent,
    });
    return walk(doc.documentElement);
  }, xml);

test.describe("tool: json-to-xml", () => {
  test("pasted JSON with attributes → well-formed XML", async ({ page }) => {
    await open(page, "/es/json-a-xml");
    await page
      .getByRole("textbox", { name: "O pega tu JSON" })
      .fill('{"catalog": {"@lang": "es", "book": [{"@id": "1", "title": "Café & <té>"}, {"@id": "2", "title": "Rayuela"}], "bad key": 1}}');
    const out = fileOf(await runTool(page, "Convertir a XML"));
    expect(out.name).toBe("data.xml");
    expect(await domXml(page, readText(out.buf))).toEqual({
      name: "catalog",
      attrs: { lang: "es" },
      children: [
        { name: "book", attrs: { id: "1" }, children: [{ name: "title", attrs: {}, children: "Café & <té>" }] },
        { name: "book", attrs: { id: "2" }, children: [{ name: "title", attrs: {}, children: "Rayuela" }] },
        { name: "bad_key", attrs: {}, children: "1" },
      ],
    });
  });
});

test.describe("tool: xml-to-json", () => {
  test("XML file → JSON with attributes, lists, references and CDATA", async ({ page }) => {
    await open(page, "/es/xml-a-json", ["catalog.xml"]);
    const out = fileOf(await runTool(page, "Convertir a JSON"));
    expect(out.name).toBe("catalog.json");
    expect(readJson(out.buf)).toEqual({
      catalog: {
        "@lang": "es",
        book: [
          { "@id": "1", title: "Café & té", code: "007" },
          { "@id": "2", title: "中文", note: "<b>raw</b>" },
        ],
      },
    });
  });

  test("XXE is refused with an explanation", async ({ page }) => {
    await open(page, "/es/xml-a-json", ["corrupt/xxe.xml"]);
    expect((await runTool(page, "Convertir a JSON")).error).toContain("declara entidades");
  });

  test("malformed XML shows an error", async ({ page }) => {
    await open(page, "/es/xml-a-json", ["corrupt/broken.xml"]);
    expect((await runTool(page, "Convertir a JSON")).error).toContain("No pudimos leer el contenido");
  });
});

test.describe("tool: json-formatter", () => {
  test("pasted JSON → sorted and indented, then minified", async ({ page }) => {
    await open(page, "/es/formatear-json");
    await page.getByRole("textbox", { name: "O pega tu JSON" }).fill('{"b":[1,2],"a":{"z":true,"y":null}}');
    await page.locator("label").filter({ hasText: "Ordenar las claves" }).click();
    const out = fileOf(await runTool(page, "Formatear JSON"));
    expect(readText(out.buf)).toBe('{\n  "a": {\n    "y": null,\n    "z": true\n  },\n  "b": [\n    1,\n    2\n  ]\n}\n');
    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.getByRole("textbox", { name: "O pega tu JSON" }).fill('{\n  "a" : [ 1 , 2 ]\n}');
    await choose(page, "Minificar");
    expect(readText(fileOf(await runTool(page, "Formatear JSON")).buf)).toBe('{"a":[1,2]}\n');
  });

  test("an error shows its line and column", async ({ page }) => {
    await open(page, "/es/formatear-json");
    await page.getByRole("textbox", { name: "O pega tu JSON" }).fill('{\n  "a": 1,\n  "b": 2,\n}');
    expect((await runTool(page, "Formatear JSON")).error).toContain("(línea 4, columna 1)");
  });
});

test.describe("tool: xml-formatter", () => {
  test("XML file → indented, comments and CDATA kept", async ({ page }) => {
    await open(page, "/es/formatear-xml", ["catalog.xml"]);
    await choose(page, "4 espacios");
    const out = fileOf(await runTool(page, "Formatear XML"));
    const text = readText(out.buf);
    expect(text).toContain("<!-- Sample catalog -->");
    expect(text).toContain('    <book id="1">\n        <title>Café &amp; té</title>');
    expect(text).toContain("<![CDATA[<b>raw</b>]]>");
    expect(await domXml(page, text)).toEqual(await domXml(page, readFileSync(fixturePath("catalog.xml"), "utf8")));
  });

  test("an error shows its line", async ({ page }) => {
    await open(page, "/en/xml-formatter");
    await page.getByRole("textbox", { name: "Or paste your XML" }).fill("<a>\n  <b>\n</a>");
    expect((await runTool(page, "Format XML")).error).toMatch(/\(line 3, column \d+\)/);
  });
});

test.describe("tool: yaml-formatter", () => {
  test("YAML file → re-indented with comments and documents kept", async ({ page }) => {
    await open(page, "/es/formatear-yaml", ["config.yaml"]);
    const out = fileOf(await runTool(page, "Formatear YAML"));
    const text = readText(out.buf);
    expect(text).toContain("# Sample service config");
    expect(YAML.parseAllDocuments(text).map((d) => d.toJS())).toEqual(
      YAML.parseAllDocuments(readFileSync(fixturePath("config.yaml"), "utf8")).map((d) => d.toJS()),
    );
  });

  test("a repeated key shows its position", async ({ page }) => {
    await open(page, "/es/formatear-yaml");
    await page.getByRole("textbox", { name: "O pega tu YAML" }).fill("a: 1\nb: 2\na: 3\n");
    expect((await runTool(page, "Formatear YAML")).error).toContain("(línea 3, columna 1)");
  });
});

test.describe("tool: base64-encode", () => {
  test("a PNG file → base64 identical to Node's, and a data URL", async ({ page }) => {
    const png = readFileSync(fixturePath("image.png"));
    await open(page, "/es/codificar-base64", ["image.png"]);
    const out = fileOf(await runTool(page, "Codificar a Base64"));
    expect(out.name).toBe("image.png.txt");
    expect(readText(out.buf)).toBe(png.toString("base64"));
    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixturePath("image.png"));
    await choose(page, "Data URL");
    expect(readText(fileOf(await runTool(page, "Codificar a Base64")).buf)).toBe(`data:image/png;base64,${png.toString("base64")}`);
  });

  test("pasted UTF-8 text", async ({ page }) => {
    await open(page, "/es/codificar-base64");
    await page.getByRole("textbox", { name: "O escribe o pega el texto" }).fill("Olá, 中文 ✓");
    expect(readText(fileOf(await runTool(page, "Codificar a Base64")).buf)).toBe(Buffer.from("Olá, 中文 ✓").toString("base64"));
  });
});

test.describe("tool: base64-decode", () => {
  test("a pasted data URL → the original PNG, byte for byte", async ({ page }) => {
    const png = readFileSync(fixturePath("image.png"));
    await open(page, "/es/decodificar-base64");
    await page.getByRole("textbox", { name: "O pega tu Base64" }).fill(`data:image/png;base64,${png.toString("base64")}`);
    const out = fileOf(await runTool(page, "Decodificar Base64"));
    expect(out.name).toBe("decoded.png");
    expect(out.buf.equals(png)).toBe(true);
  });

  test("bare base64 of a PDF is recognized by its content", async ({ page }) => {
    const pdf = readFileSync(fixturePath("document-1page.pdf"));
    await open(page, "/es/decodificar-base64");
    await page.getByRole("textbox", { name: "O pega tu Base64" }).fill(pdf.toString("base64").replace(/.{76}/g, "$&\n"));
    const out = fileOf(await runTool(page, "Decodificar Base64"));
    expect(out.name).toBe("decoded.pdf");
    expect(out.buf.equals(pdf)).toBe(true);
  });

  test("text comes back with a preview, invalid input shows an error", async ({ page }) => {
    await open(page, "/es/decodificar-base64");
    await page.getByRole("textbox", { name: "O pega tu Base64" }).fill(Buffer.from("Hola, ñandú").toString("base64"));
    const out = fileOf(await runTool(page, "Decodificar Base64"));
    expect(out.name).toBe("decoded.txt");
    await expect(page.getByRole("textbox", { name: "Vista previa" })).toHaveValue("Hola, ñandú");
    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await page.getByRole("textbox", { name: "O pega tu Base64" }).fill("esto no es base64!");
    expect((await runTool(page, "Decodificar Base64")).error).toContain("No pudimos leer el contenido");
  });
});

test.describe("tool: url-encode", () => {
  test("encodes a value and a whole URL, and decodes form text", async ({ page }) => {
    await open(page, "/es/codificar-url");
    const box = page.getByRole("textbox", { name: "O escribe o pega el texto" });
    await box.fill("café con leche & pan/?");
    expect(readText(fileOf(await runTool(page, "Codificar URL")).buf)).toBe(encodeURIComponent("café con leche & pan/?"));
    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await box.fill("https://example.com/búsqueda?q=ñ&x=1");
    await choose(page, "Una URL completa");
    expect(readText(fileOf(await runTool(page, "Codificar URL")).buf)).toBe("https://example.com/b%C3%BAsqueda?q=%C3%B1&x=1");
    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await box.fill("caf%C3%A9+con+leche");
    await choose(page, "Decodificar");
    expect(readText(fileOf(await runTool(page, "Decodificar URL")).buf)).toBe("café con leche");
  });

  test("a malformed % sequence shows an error", async ({ page }) => {
    await open(page, "/es/codificar-url");
    await page.getByRole("textbox", { name: "O escribe o pega el texto" }).fill("%E0%A4%A");
    await choose(page, "Decodificar");
    expect((await runTool(page, "Decodificar URL")).error).toContain("No pudimos leer el contenido");
  });
});

test.describe("tool: hash-generator", () => {
  const digest = (algorithm: string, bytes: Buffer | string) => createHash(algorithm).update(bytes).digest("hex");

  test("two files → checksums.txt equal to Node's crypto, and the expected hash matches", async ({ page }) => {
    const png = readFileSync(fixturePath("image.png"));
    const pdf = readFileSync(fixturePath("document.pdf"));
    await open(page, "/es/generador-hash", ["image.png", "document.pdf"]);
    await page.getByRole("textbox", { name: "Hash esperado (opcional)" }).fill(digest("sha256", pdf).toUpperCase());
    const out = fileOf(await runTool(page, "Calcular hash"));
    expect(out.name).toBe("checksums.txt");
    const lines = readText(out.buf).trim().split("\n");
    const expected = (name: string, bytes: Buffer) => [
      `MD5 (${name}) = ${digest("md5", bytes)}`,
      `SHA1 (${name}) = ${digest("sha1", bytes)}`,
      `SHA256 (${name}) = ${digest("sha256", bytes)}`,
      `SHA512 (${name}) = ${digest("sha512", bytes)}`,
    ];
    expect(lines).toEqual([...expected("image.png", png), ...expected("document.pdf", pdf)]);
    await expect(page.getByText("Coincide: el SHA-256 de document.pdf es igual al hash esperado.")).toBeVisible();
  });

  test("SHA-256 only: sha256sum -c accepts the downloaded file", async ({ page }) => {
    await open(page, "/es/generador-hash", ["image.jpg", "text.txt"]);
    for (const name of ["MD5", "SHA-1", "SHA-512"]) await choose(page, name);
    const out = fileOf(await runTool(page, "Calcular hash"));
    const dir = mkdtempSync(join(tmpdir(), "checksums-"));
    writeFileSync(join(dir, "checksums.txt"), out.buf);
    const check = execFileSync("sha256sum", ["-c", join(dir, "checksums.txt")], { cwd: fixturePath("."), encoding: "utf8" });
    expect(check).toBe("image.jpg: OK\ntext.txt: OK\n");
  });

  test("pasted text in upper case; a wrong expected hash is reported", async ({ page }) => {
    await open(page, "/en/hash-generator");
    await page.getByRole("textbox", { name: "Or type or paste the text" }).fill("abc");
    await page.getByRole("textbox", { name: "Expected hash (optional)" }).fill("900150983cd24fb0d6963f7d28e17f73");
    await choose(page, "Upper-case hexadecimal");
    const out = fileOf(await runTool(page, "Calculate hash"));
    const text = readText(out.buf);
    expect(text).toContain("MD5 (text) = 900150983CD24FB0D6963F7D28E17F72\n");
    expect(text).toContain(`SHA256 (text) = ${digest("sha256", "abc").toUpperCase()}\n`);
    await expect(page.getByText("No match: no file has the expected hash.")).toBeVisible();
  });
});

test.describe("tool: uuid-generator", () => {
  test("a batch of v7 UUIDs: valid, unique, time-ordered and starting with now", async ({ page }) => {
    await open(page, "/es/generador-uuid");
    await choose(page, "v7 (ordenado por tiempo)");
    await page.getByRole("spinbutton", { name: /Cantidad/ }).fill("500");
    const before = Date.now();
    const out = fileOf(await runTool(page, "Generar UUID"));
    expect(out.name).toBe("uuids.txt");
    const ids = readText(out.buf).trim().split("\n");
    expect(ids).toHaveLength(500);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(ids).size).toBe(500);
    expect([...ids].sort()).toEqual(ids);
    const ms = parseInt(ids[0]!.replace(/-/g, "").slice(0, 12), 16);
    expect(Math.abs(ms - before)).toBeLessThan(60_000);
  });

  test("one v4 UUID in upper case without hyphens", async ({ page }) => {
    await open(page, "/en/uuid-generator");
    await choose(page, "With hyphens");
    await choose(page, "Upper-case hexadecimal");
    const out = fileOf(await runTool(page, "Generate UUIDs"));
    expect(out.name).toBe("uuid.txt");
    expect(readText(out.buf)).toMatch(/^[0-9A-F]{12}4[0-9A-F]{3}[89AB][0-9A-F]{15}\n$/);
  });
});

test.describe("tool: timestamp-converter", () => {
  test("seconds, milliseconds and dates → CSV in the chosen time zone", async ({ page }) => {
    await open(page, "/es/convertir-timestamp");
    await page.getByRole("textbox", { name: "Timestamps o fechas, uno por línea" }).fill("1700000000\n1700000000123\n2023-11-14 19:13:20\n");
    await page.getByRole("combobox", { name: "Zona horaria" }).selectOption("America/Sao_Paulo");
    const out = fileOf(await runTool(page, "Convertir"));
    expect(out.name).toBe("timestamps.csv");
    const rows = readCsv(out.buf).filter((r) => r.some(Boolean));
    expect(rows).toEqual([
      ["input", "unix_seconds", "unix_milliseconds", "iso_8601_utc", "America/Sao_Paulo", "utc_offset"],
      ["1700000000", "1700000000", "1700000000000", "2023-11-14T22:13:20.000Z", "2023-11-14 19:13:20.000", "UTC-03:00"],
      ["1700000000123", "1700000000.123", "1700000000123", "2023-11-14T22:13:20.123Z", "2023-11-14 19:13:20.123", "UTC-03:00"],
      ["2023-11-14 19:13:20", "1700000000", "1700000000000", "2023-11-14T22:13:20.000Z", "2023-11-14 19:13:20.000", "UTC-03:00"],
    ]);
  });

  test("an invalid line is reported with its position", async ({ page }) => {
    await open(page, "/es/convertir-timestamp");
    await page.getByRole("textbox", { name: "Timestamps o fechas, uno por línea" }).fill("1700000000\n2023-02-30");
    const result = await runTool(page, "Convertir");
    expect(result.error).toContain("línea 2, columna 1");
  });
});
