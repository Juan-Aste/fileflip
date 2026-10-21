// Data tools (JSON ↔ CSV/TSV/YAML/TOML) run like a user would: pick a fixture
// or paste text, download the result and read it back with independent readers
// (the YAML and TOML readers are libraries, but not the app's code paths).
import { readFileSync } from "node:fs";
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
  test("nested JSON file → CSV with dotted columns and a BOM", async ({ page }) => {
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
