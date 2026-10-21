import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HtmlTooComplexError, htmlToPrintHtml } from "./html-print";

const fixture = (name: string) => readFileSync(join(__dirname, "../../../tests/fixtures", name), "utf8");
const a4 = { pageSize: "a4" } as const;
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** Every way an HTML page can make Chromium fetch, navigate or run code (the URL is filled in per test). */
const attacks = (url: string) => `<!doctype html><html><head>
<meta http-equiv="refresh" content="0;url=${url}/refresh"><base href="${url}/base/">
<link rel="stylesheet" href="${url}/link.css"><link rel="preload" as="image" href="${url}/preload">
<style>@import url(${url}/import.css); body{background:url(${url}/bg)} @font-face{font-family:x;src:url(${url}/font)}</style>
<script>fetch("${url}/script")</script><script src="${url}/script.js"></script></head>
<body onload="fetch('${url}/onload')" background="${url}/body-bg"><h1 style="background-image:url(${url}/inline)">Título</h1>
<img src="${url}/img" srcset="${url}/srcset 2x" onerror="fetch('${url}/onerror')"><img src="${PIXEL}" alt="ok">
<picture><source srcset="${url}/source"><img src="${url}/picture"></picture>
<iframe src="${url}/iframe"></iframe><iframe srcdoc="<img src=${url}/srcdoc>"></iframe><object data="${url}/object"></object><embed src="${url}/embed">
<video poster="${url}/poster" src="${url}/video"></video><audio src="${url}/audio"></audio>
<input type="image" src="${url}/input"><table background="${url}/table"><tr><td>celda</td></tr></table>
<svg><image href="${url}/svg-image"/><use href="${url}/use"/><image><animate attributeName="href" values="${url}/animate"/></image><a href="javascript:fetch('${url}/svg-a')"><text>t</text></a><script>fetch("${url}/svg-script")</script></svg>
<math href="${url}/math"><mi>x</mi></math><form action="${url}/form"><button formaction="${url}/button">b</button></form>
<a href="${url}/ping" ping="${url}/ping-beacon">enlace</a> <a href="javascript:alert(1)">mal</a>
<noscript><img src="${url}/noscript"></noscript><template><img src="${url}/template"></template><!-- <img src="${url}/comment"> -->
</body></html>`;

describe("htmlToPrintHtml", () => {
  it("puts its charset and CSP first in <head> and keeps the document's content and styles", () => {
    const html = htmlToPrintHtml(fixture("page.html"), { pageSize: "letter" });
    expect(html).toMatch(/^<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:"><style>@page\{size:letter;/);
    expect(html).toContain("<title>Página</title>");
    expect(html).toContain("<style>h1{color:red}</style>");
    expect(html).toContain("<table>");
    expect(html).toContain('<a href="https://example.com/docs">Documentación</a>');
    expect(html).toContain('<img alt="logo">');
    expect(html).not.toMatch(/<script|onerror|pwned = 4|remote\.png/);
  });

  it("removes every element and attribute that could load, navigate or run", () => {
    const html = htmlToPrintHtml(attacks("http://attacker.test"), a4);
    // Outside CSS (whose url() and @import the CSP blocks, checked below) the
    // only URL left is the plain link, never followed while printing.
    const markup = html.replace(/<style>[\s\S]*?<\/style>/g, "").replace(/ style="[^"]*"/g, "");
    expect(markup.match(/attacker\.test[^"]*/g)).toEqual(["attacker.test/ping"]);
    expect(html).toContain(`<img src="${PIXEL}" alt="ok">`);
    expect(html).not.toMatch(/<(script|iframe|object|embed|video|audio|source|link|base|noscript|template|animate)\b|javascript:|\son\w+=|http-equiv="refresh"/i);
    expect(html).toContain("celda");
    expect(html).toContain("Título");
  });

  it("rejects crafted deep nesting before parsing it", () => {
    expect(() => htmlToPrintHtml("<div>".repeat(5000), a4)).toThrow(HtmlTooComplexError);
    expect(() => htmlToPrintHtml(`<span>${"<b>".repeat(1500)}`, a4)).toThrow(HtmlTooComplexError);
    // Unclosed list items and paragraphs don't nest: a long sloppy list is fine.
    expect(htmlToPrintHtml(`<ul>${"<li>x".repeat(5000)}</ul>${"<p>y".repeat(3000)}`, a4)).toContain("<li>x</li>");
  });

  it("wraps a bare fragment in a full page", () => {
    expect(htmlToPrintHtml("<p>hola</p>", a4)).toMatch(/^<html><head><meta charset="utf-8">[\s\S]*<\/head><body><p>hola<\/p><\/body><\/html>$/);
  });
});

const chromiumPath = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => p && existsSync(p));

describe.runIf(chromiumPath)("printing sanitized HTML with Chromium", () => {
  let server: Server;
  let base = "";
  const hits: string[] = [];
  beforeAll(async () => {
    server = createServer((req, res) => {
      hits.push(req.url ?? "");
      res.end("x");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(() => server.close());

  it("never reaches the network, and still prints the content", async () => {
    const browser = await chromium.launch({ executablePath: chromiumPath });
    try {
      // Control: the unsanitized page does reach the test server.
      const control = await browser.newPage();
      await control.setContent(attacks(base), { waitUntil: "load" }).catch(() => {});
      await control.close();
      expect(hits.length).toBeGreaterThan(5);
      hits.length = 0;

      const page = await browser.newPage();
      // Requests blocked by the CSP are still reported as "request" events; none may finish.
      const requests: string[] = [];
      page.on("requestfinished", (r) => requests.push(r.url()));
      await page.setContent(htmlToPrintHtml(attacks(base), a4), { waitUntil: "load" });
      const pdf = await page.pdf({ preferCSSPageSize: true });
      await new Promise((r) => setTimeout(r, 300));
      expect(hits).toEqual([]);
      expect(requests.filter((u) => !u.startsWith("data:"))).toEqual([]);
      const doc = await PDFDocument.load(pdf);
      expect(Math.round(doc.getPage(0).getSize().width)).toBe(595);
    } finally {
      await browser.close();
    }
  }, 30_000);
});

describe.runIf(process.env.GOTENBERG_URL)("printing with Gotenberg", () => {
  it("prints the fixture page with its title and text", async () => {
    const { htmlToPdf } = await import("./gotenberg");
    const pdf = await htmlToPdf(htmlToPrintHtml(fixture("page.html"), a4));
    const doc = await PDFDocument.load(pdf);
    expect(doc.getTitle()).toBe("Página");
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const js = await getDocument({ data: new Uint8Array(pdf), verbosity: 0 }).promise;
    const text = ((await (await js.getPage(1)).getTextContent()).items as { str?: string }[]).map((t) => t.str ?? "").join("").normalize("NFKC");
    for (const expected of ["Guía 中文", "Hola", "mundo", "dos", 'print("hola")', "Documentación"]) expect(text).toContain(expected);
  }, 60_000);
});
