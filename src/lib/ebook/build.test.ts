// @vitest-environment jsdom
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { markdownToHtml } from "@/lib/markup/markdown";
import { ConversionError } from "@/lib/convert-error";
import { buildEpub, type EpubMetadata } from "./build";
import { readEpub } from "./epub";
import { epubToText } from "./render";

const fixtures = join(__dirname, "../../../tests/fixtures");
const png = readFileSync(join(fixtures, "image.png")).toString("base64");
const meta: EpubMetadata = {
  title: "Mi libro",
  author: "Ana <Ejemplo> & Cía",
  language: "es",
  contentsLabel: "Contenido",
  identifier: "urn:uuid:00000000-0000-4000-8000-000000000000",
  modified: new Date("2026-10-22T03:00:00.123Z"),
};

const markdown = `# Primera parte

Texto con **negrita** y un [salto](#segunda-parte).

![Logo](data:image/png;base64,${png})

# Segunda parte

| A | B |
| :---: | ---: |
| 1 | 2 |

- [x] hecho
`;

const html = `<h2>Notas</h2><p onclick="alert(1)">Hola<br>mundo &amp; más</p><script>window.pwned=1</script>
<img src="https://example.com/x.png" alt="remota"><img src="data:image/svg+xml;base64,${btoa("<svg xmlns='http://www.w3.org/2000/svg'><script>1</script></svg>")}" alt="svg">
<a href="javascript:alert(2)">mal</a> <a href="https://example.com">bien</a> <a href="otra.html">relativo</a>
<center><font color="red" face="Arial">Centrado</font></center><table border="1" width="50%"><tr><td valign="top" bgcolor="#eee">celda</td></tr></table><a name="ancla"></a>`;

const sources = [
  { name: "libro.md", html: markdownToHtml(markdown, { fullDocument: false }) },
  { name: "notas.html", html },
];

/** The ZIP's entries in their stored order, with each one's compression method (local headers). */
function zipEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries: { name: string; method: number; extra: number }[] = [];
  for (let o = 0; view.getUint32(o, true) === 0x04034b50; ) {
    const method = view.getUint16(o + 8, true);
    const size = view.getUint32(o + 18, true);
    const nameLength = view.getUint16(o + 26, true);
    const extra = view.getUint16(o + 28, true);
    entries.push({ name: new TextDecoder().decode(bytes.subarray(o + 30, o + 30 + nameLength)), method, extra });
    o += 30 + nameLength + extra + size;
  }
  return entries;
}

describe("buildEpub", () => {
  it("OCF: an uncompressed mimetype entry first, without extra fields", () => {
    const entries = zipEntries(buildEpub(sources, meta));
    expect(entries[0]).toEqual({ name: "mimetype", method: 0, extra: 0 });
    expect(entries.map((e) => e.name)).toEqual([
      "mimetype",
      "META-INF/container.xml",
      "OEBPS/content.opf",
      "OEBPS/nav.xhtml",
      "OEBPS/toc.ncx",
      "OEBPS/style.css",
      "OEBPS/chapter-1.xhtml",
      "OEBPS/chapter-2.xhtml",
      "OEBPS/chapter-3.xhtml",
      "OEBPS/images/image-1.png",
    ]);
  });

  it("reads back: metadata, chapters split at each H1, links between chapters, the image byte for byte", () => {
    const bytes = buildEpub(sources, meta);
    const book = readEpub(bytes);
    expect(book.title).toBe("Mi libro");
    expect(book.creators).toEqual(["Ana <Ejemplo> & Cía"]);
    expect(book.language).toBe("es");
    expect(book.chapters.map((c) => c.path)).toEqual(["OEBPS/chapter-1.xhtml", "OEBPS/chapter-2.xhtml", "OEBPS/chapter-3.xhtml"]);
    expect(book.chapters[0]!.html).toContain('<a href="chapter-2.xhtml#segunda-parte">salto</a>');
    expect(book.chapters[0]!.html).toContain('<img src="images/image-1.png" alt="Logo" />');
    expect(Buffer.from(book.images[0]!.data).equals(readFileSync(join(fixtures, "image.png")))).toBe(true);
    const files = unzipSync(bytes);
    const opf = new TextDecoder().decode(files["OEBPS/content.opf"]);
    expect(opf).toContain('<meta property="dcterms:modified">2026-10-22T03:00:00Z</meta>');
    expect(opf).toContain("<dc:creator>Ana &lt;Ejemplo&gt; &amp; Cía</dc:creator>");
    const nav = new TextDecoder().decode(files["OEBPS/nav.xhtml"]);
    expect(nav).toContain('<li><a href="chapter-3.xhtml">Notas</a></li>');
    expect(new TextDecoder().decode(files["OEBPS/toc.ncx"])).toContain('<meta name="dtb:uid" content="urn:uuid:00000000-0000-4000-8000-000000000000"/>');
  });

  it("every chapter is well-formed XHTML without scripts, handlers, remote or SVG images", () => {
    const files = unzipSync(buildEpub(sources, meta));
    for (const name of ["OEBPS/chapter-1.xhtml", "OEBPS/chapter-2.xhtml", "OEBPS/chapter-3.xhtml", "OEBPS/nav.xhtml"]) {
      const xml = new TextDecoder().decode(files[name]);
      const doc = new DOMParser().parseFromString(xml, "application/xhtml+xml");
      expect(doc.querySelector("parsererror"), name).toBeNull();
      expect(xml).not.toMatch(/<script|onclick|javascript:|example\.com\/x\.png|svg\+xml/);
    }
    const notes = new TextDecoder().decode(files["OEBPS/chapter-3.xhtml"]);
    expect(notes).toContain("Hola<br />mundo &amp; más");
    expect(notes).toContain('<a href="https://example.com">bien</a>');
    expect(notes).toContain("<a>relativo</a>");
    expect(notes).toContain("remota");
    expect(notes).toContain('<div style="text-align:center;"><span>Centrado</span></div>');
    expect(notes).toContain("<table><tbody><tr><td>celda</td></tr></tbody></table>");
    expect(notes).toContain('<a id="ancla"></a>');
    expect(new TextDecoder().decode(files["OEBPS/chapter-2.xhtml"])).toContain('<th style="text-align:center;">A</th>');
    const text = epubToText(readEpub(buildEpub(sources, meta)));
    expect(text).toContain("A\tB\n1\t2");
  });

  it("title from the first heading when none is given; bad language tags become und; empty input fails", () => {
    const book = readEpub(buildEpub([{ name: "a.html", html: "<p>sin título</p>" }], { ...meta, title: " ", author: "", language: "es; x" }));
    expect(book.title).toBe("a");
    expect(book.creators).toEqual([]);
    expect(book.language).toBe("und");
    expect(() => buildEpub([{ name: "x.html", html: "<script>1</script>   " }], meta)).toThrow(ConversionError);
  });

  it.skipIf(!process.env.EPUBCHECK_JAR)("passes EPUBCheck (EPUBCHECK_JAR)", () => {
    const file = join(mkdtempSync(join(tmpdir(), "epub-")), "book.epub");
    writeFileSync(file, buildEpub(sources, meta));
    const output = execFileSync("java", ["-jar", process.env.EPUBCHECK_JAR!, file], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    expect(output).toContain("No errors or warnings detected");
  });
});
