import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright-core";
import { describe, expect, it } from "vitest";
import { markdownToPrintHtml } from "./markdown-pdf";

const fixture = (name: string) => readFileSync(join(__dirname, "../../../tests/fixtures", name), "utf8");
const a4 = { pageSize: "a4" } as const;
// 1×1 transparent PNG.
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function pdfText(bytes: Uint8Array) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(""));
  }
  // CJK fonts often map glyphs to compatibility code points (⽂ U+2F42 for 文).
  return pages.join("\n").normalize("NFKC");
}

describe("markdownToPrintHtml", () => {
  it("renders GitHub Markdown into a page whose CSP blocks every request", () => {
    const html = markdownToPrintHtml(fixture("document.md"), a4);
    const head = html.slice(0, html.indexOf("</head>"));
    // The policy comes before anything that could load.
    expect(head.indexOf("Content-Security-Policy")).toBeLessThan(head.indexOf("<style>"));
    expect(head).toContain(`content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:"`);
    expect(head).toContain("<title>Informe ñandú</title>");
    expect(head).toContain("size:A4");
    expect(html).toContain("<table>");
    expect(html).toContain('<input checked="" disabled="" type="checkbox">');
    expect(html).toContain("<del>tachado</del>");
    expect(html).toContain('<a href="https://example.com">Fileflect</a>');
    // Raw HTML is reduced to text; no scripts, handlers, javascript: links or remote images.
    expect(html).not.toMatch(/<script|onerror|javascript:|<img src="x\.png"/i);
    expect(html).toContain("window.top.pwned = 1");
  });

  it("keeps data: images only and shows the alt text of the others", () => {
    const md = `![pixel](${PIXEL} "t")\n\n![meta](http://169.254.169.254/latest/meta-data)\n![local](file:///etc/passwd)\n![svg](data:image/svg+xml;base64,PHN2Zy8+)`;
    const html = markdownToPrintHtml(md, a4);
    expect(html).toContain(`<img src="${PIXEL}" alt="pixel" title="t">`);
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).toContain('<span class="missing-image">[meta]</span>');
    expect(html).not.toMatch(/169\.254|file:|image\/svg/);
  });

  it("strips tags that try to hide inside each other, and escapes attributes", () => {
    const md = `<scr<script>ipt>alert(1)</script>\n\n<meta http-equiv="refresh" content="0;url=http://10.0.0.1/">\n\n<!-- <iframe src="http://10.0.0.1"> -->\n\n# A "quoted" <b>title</b> & co\n\n[x](https://e.com/?a="b"&c=<d>)`;
    const html = markdownToPrintHtml(md, { pageSize: "letter" });
    const body = html.slice(html.indexOf("<body>"));
    expect(body).not.toMatch(/<(script|meta|iframe|b)\b/i);
    expect(body).not.toContain("10.0.0.1");
    expect(html).toContain("<title>A &quot;quoted&quot; title &amp; co</title>");
    expect(html).toContain("size:letter");
    expect(body).not.toMatch(/href="[^"]*"b/);
  });
});

// Gotenberg prints with Chromium; the same engine checks the page offline.
const chromiumPath = [process.env.CHROME_PATH, "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => p && existsSync(p));

describe.runIf(chromiumPath)("printing with Chromium", () => {
  it("makes a PDF with the text, tables and title and never requests anything", async () => {
    const browser = await chromium.launch({ executablePath: chromiumPath });
    try {
      const page = await browser.newPage();
      const requests: string[] = [];
      page.on("request", (r) => requests.push(r.url()));
      const md = `${fixture("document.md")}\n\n中文 ç ü\n\n![pixel](${PIXEL})\n\n![remote](http://127.0.0.1:9/x.png)\n\n<img src="http://127.0.0.1:9/raw.png"><iframe src="http://127.0.0.1:9/"></iframe>`;
      await page.setContent(markdownToPrintHtml(md, { pageSize: "letter" }), { waitUntil: "load" });
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
      expect(requests).toEqual([]);
      const doc = await PDFDocument.load(pdf);
      const { width, height } = doc.getPage(0).getSize();
      expect([Math.round(width), Math.round(height)]).toEqual([612, 792]);
      const text = await pdfText(pdf);
      for (const expected of ["Informe ñandú", "negrita", "Producto", "Café", "3,10", "const total = 5.6;", "中文", "[remote]"]) {
        expect(text).toContain(expected);
      }
    } finally {
      await browser.close();
    }
  }, 30_000);
});

// Against a real Gotenberg (docker compose up gotenberg; GOTENBERG_URL set).
describe.runIf(process.env.GOTENBERG_URL)("printing with Gotenberg", () => {
  it("returns an A4 PDF with the document's text and title", async () => {
    const { htmlToPdf } = await import("./gotenberg");
    const pdf = await htmlToPdf(markdownToPrintHtml(`${fixture("document.md")}\n\n中文`, a4));
    const doc = await PDFDocument.load(pdf);
    const { width, height } = doc.getPage(0).getSize();
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842]);
    expect(doc.getTitle()).toBe("Informe ñandú");
    const text = await pdfText(pdf);
    for (const expected of ["Informe ñandú", "Producto", "Café", "const total = 5.6;", "中文"]) expect(text).toContain(expected);
    expect(text).not.toContain("<script");
  }, 60_000);
});
