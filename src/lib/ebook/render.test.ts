// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readEpub } from "./epub";
import { chapterText, epubToHtml, epubToText, xhtmlForHtmlParser } from "./render";

const dir = join(__dirname, "../../../tests/fixtures");
const book = () => readEpub(new Uint8Array(readFileSync(join(dir, "book.epub"))));
const dom = (html: string) => new DOMParser().parseFromString(html, "text/html");

describe("epubToHtml", () => {
  it("one page: CSP first, title, authors, table of contents and chapters in order", () => {
    const html = epubToHtml(book(), { images: true, contentsLabel: "Contenido" });
    const doc = dom(html);
    expect(doc.head.firstElementChild?.getAttribute("charset")).toBe("utf-8");
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute("content")).toContain("default-src 'none'");
    expect(doc.documentElement.lang).toBe("es");
    expect(doc.title).toBe("El viaje de prueba");
    expect(doc.querySelector("header.book p")?.textContent).toBe("Ana Ejemplo, Luis Muestra");
    expect(Array.from(doc.querySelectorAll("nav.toc a"), (a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Capítulo 1: La partida", "#c1"],
      ["Capítulo 2", "#c2"],
    ]);
    expect(Array.from(doc.querySelectorAll("section.chapter"), (s) => s.id)).toEqual(["c0", "c1", "c2"]);
    expect(doc.querySelector("#c2 table td")?.textContent).toBe("Lunes");
    // The self-closing <a id="top"/> did not swallow the chapter.
    expect(doc.querySelector("#c1-top")?.textContent).toBe("");
    expect(doc.querySelector("#c1 h1")?.textContent).toBe("Capítulo 1: La partida");
  });

  it("links between chapters become anchors that exist; external links stay; javascript: goes", () => {
    const doc = dom(epubToHtml(book(), { images: true, contentsLabel: "Contenido" }));
    const hrefs = Array.from(doc.querySelectorAll("section a[href]"), (a) => a.getAttribute("href")!);
    expect(hrefs).toEqual(["#c2-llegada", "https://example.com/", "#c1-start"]);
    for (const href of hrefs.filter((h) => h.startsWith("#"))) expect(doc.getElementById(href.slice(1))).not.toBeNull();
    expect(doc.body.innerHTML).not.toMatch(/javascript:|onclick|<script|pwned|example\.com\/tracker|bg\.png|<link/);
  });

  it("images: embedded as data: URLs (cover SVG → img), or left out with their alt text", () => {
    const withImages = dom(epubToHtml(book(), { images: true, contentsLabel: "Contenido" }));
    const sources = Array.from(withImages.querySelectorAll("img"), (img) => img.getAttribute("src")!);
    expect(sources).toHaveLength(2);
    for (const src of sources) expect(src).toMatch(/^data:image\/png;base64,iVBORw0KGgo/);
    expect(withImages.querySelector("#c0 svg")).toBeNull();
    // The remote image is never requested: only its alt text is left.
    expect(withImages.querySelector("#c1")?.textContent).toContain("Imagen remota");
    const without = dom(epubToHtml(book(), { images: false, contentsLabel: "Contenido" }));
    expect(without.querySelectorAll("img")).toHaveLength(0);
    expect(without.querySelector("#c1")?.textContent).toContain("Cuadro rojo");
  });
});

describe("epubToText", () => {
  it("title, authors and chapters with paragraphs, list items and table cells", () => {
    const text = epubToText(book());
    expect(text.startsWith("El viaje de prueba\nAna Ejemplo, Luis Muestra\n\n\nCapítulo 1: La partida\n\nEra una mañana")).toBe(true);
    expect(text).toContain("capítulo dos o visita la web.");
    expect(text).toContain("Un enlace peligroso: no.\nSegunda línea.");
    expect(text).toContain("- Primero\n- Segundo");
    expect(text).toContain("Día\tKilómetros\nLunes\t12");
    expect(text).not.toMatch(/pwned|Capítulo 1<\/title>/);
    expect(text.endsWith("Volver al inicio\n")).toBe(true);
  });

  it("character references and UTF-16 chapters (EPUB 2)", () => {
    const text = epubToText(readEpub(new Uint8Array(readFileSync(join(dir, "book-epub2.epub")))));
    expect(text).toContain("The quick brown fox\u00a0jumps over the lazy dog.\n\nCafé and naïve.");
    expect(text).toContain("Written in UTF-16: 東京 and Zürich.");
  });
});

describe("xhtmlForHtmlParser", () => {
  it("drops the XML declaration and a DOCTYPE with an internal subset; opens and closes self-closed elements", () => {
    const out = xhtmlForHtmlParser('<?xml version="1.0"?><!DOCTYPE html [<!ENTITY x "boom">]><p>a<span class="x"/>b<br/></p>');
    expect(out).toBe('<p>a<span class="x"></span>b<br/></p>');
    expect(chapterText("<!DOCTYPE html [<!ENTITY x 'boom'>]><p>&x;</p>")).toBe("&x;");
  });
});
