// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { docxText, epubText, htmlText, markdownText, plainText } from "./formats";
import { splitSentences } from "./text";

const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "../../../tests/fixtures", name)));

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const docx = (body: string, extra: Record<string, Uint8Array> = {}) =>
  zipSync({ "[Content_Types].xml": strToU8("<Types/>"), "word/document.xml": strToU8(`<?xml version="1.0"?><w:document ${W}><w:body>${body}</w:body></w:document>`), ...extra });

describe("docxText", () => {
  it("reads the paragraphs of a real Word file", () => {
    const { text } = docxText(fixture("document.docx"));
    expect(text.startsWith("Fileflect sample document\n\nSynthetic paragraph for automated conversion tests. Acentos: áéíóú ñ.")).toBe(true);
    expect(text).not.toMatch(/<|w:/);
  });

  it("keeps runs together, turns tabs and breaks into spaces and lines, skips deleted text and reads the title", () => {
    const body =
      '<w:p><w:r><w:t xml:space="preserve">Hola </w:t></w:r><w:r><w:t>mundo</w:t><w:tab/><w:t>tab</w:t></w:r></w:p>' +
      "<w:p><w:r><w:t>línea</w:t><w:br/><w:t>otra</w:t></w:r><w:del><w:r><w:delText>borrado</w:delText></w:r></w:del></w:p>" +
      "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>celda</w:t></w:r></w:p></w:tc></w:tr></w:tbl>";
    const core = strToU8('<cp:coreProperties xmlns:cp="x" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title> Mi  informe </dc:title></cp:coreProperties>');
    const result = docxText(docx(body, { "docProps/core.xml": core }));
    expect(result).toEqual({ text: "Hola mundo tab\n\nlínea\notra\n\ncelda", title: "Mi informe" });
  });

  it("refuses DTDs and damaged files", () => {
    const evil = zipSync({ "word/document.xml": strToU8('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "aaaa">]><w:document ' + W + "><w:body/></w:document>") });
    expect(() => docxText(evil)).toThrow(expect.objectContaining({ code: "xmlEntitiesBlocked" }));
    expect(() => docxText(zipSync({ "other.xml": strToU8("<a/>") }))).toThrow(expect.objectContaining({ code: "fileDamaged" }));
    expect(() => docxText(strToU8("not a zip"))).toThrow(expect.objectContaining({ code: "fileDamaged" }));
    expect(() => docxText(zipSync({ "word/document.xml": strToU8("<w:document><unclosed>") }))).toThrow(expect.objectContaining({ code: "fileDamaged" }));
  });
});

describe("epubText", () => {
  it("reads the chapters and the book title", () => {
    const { text, title } = epubText(fixture("book.epub"));
    expect(title).toBeTruthy();
    expect(text.length).toBeGreaterThan(20);
    expect(text).not.toMatch(/<[a-z]/i);
    expect(splitSentences(text).length).toBeGreaterThan(1);
  });
});

describe("htmlText", () => {
  it("reads the visible text without scripts or styles, list bullets or markup", () => {
    const { text, title } = htmlText(new TextDecoder().decode(fixture("page.html")));
    expect(title).toBe("Página");
    expect(text.startsWith("Guía 中文\n\nHola mundo y bienvenidos.")).toBe(true);
    expect(text).toContain("\nuno\n");
    expect(text).not.toMatch(/pwned|color:red|<|^- /m);
  });
});

describe("markdownText", () => {
  it("reads Markdown as text: no asterisks, links by their label, first heading as title", () => {
    const { text, title } = markdownText(new TextDecoder().decode(fixture("document.md")));
    expect(title).toBe("Informe ñandú");
    expect(text).toContain("Texto con negrita, cursiva y tachado.");
    expect(text).toContain("Fileflect");
    expect(text).not.toMatch(/\*\*|~~|\]\(|pwned|^- /m);
  });
});

describe("plainText", () => {
  it("decodes UTF-8 and Windows-1252 text and normalizes it", () => {
    expect(plainText(strToU8("\uFEFFHola\r\nmundo")).text).toBe("Hola\nmundo");
    expect(plainText(new Uint8Array([0x61, 0xf1, 0x6f])).text).toBe("año");
  });
});
