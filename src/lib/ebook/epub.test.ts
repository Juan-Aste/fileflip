import { readFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { ConversionError } from "@/lib/convert-error";
import { readEpub, resolveHref } from "./epub";

const dir = join(__dirname, "../../../tests/fixtures");
const fixture = (name: string) => new Uint8Array(readFileSync(join(dir, name)));
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as ConversionError).code;
  }
  return "no error";
};

// Books written by scripts/fixtures/ebooks.py with Python's zipfile.
describe("readEpub", () => {
  it("EPUB 3: metadata, chapters in spine order (nav left out) and the images checked by content", () => {
    const book = readEpub(fixture("book.epub"));
    expect(book.title).toBe("El viaje de prueba");
    expect(book.creators).toEqual(["Ana Ejemplo", "Luis Muestra"]);
    expect(book.language).toBe("es");
    expect(book.chapters.map((c) => c.path)).toEqual(["OEBPS/Text/cover.xhtml", "OEBPS/Text/chapter 1.xhtml", "OEBPS/Text/ch2.xhtml"]);
    expect(book.chapters[1]!.html).toContain("Capítulo 1: La partida");
    expect(book.images.map((i) => [i.path, i.mime])).toEqual([
      ["OEBPS/Images/red.png", "image/png"],
      ["OEBPS/Images/cover.png", "image/png"],
    ]);
  });

  it("EPUB 2: NCX package, a path with spaces, a non-linear UTF-16 chapter", () => {
    const book = readEpub(fixture("book-epub2.epub"));
    expect(book.title).toBe("A Test Journey");
    expect(book.creators).toEqual(["Sam Sample"]);
    expect(book.chapters.map((c) => c.path)).toEqual(["OEBPS/part one.html", "OEBPS/sub/two.xhtml"]);
    expect(book.chapters[1]!.html).toContain("東京 and Zürich");
  });

  it("refuses DRM, a missing container, DTD entities, a cut file and something that is not a ZIP", () => {
    expect(codeOf(() => readEpub(fixture("corrupt/ebook-drm.epub")))).toBe("ebookDrm");
    expect(codeOf(() => readEpub(fixture("corrupt/ebook-no-container.epub")))).toBe("fileDamaged");
    expect(codeOf(() => readEpub(fixture("corrupt/ebook-entities.epub")))).toBe("fileDamaged");
    expect(codeOf(() => readEpub(fixture("corrupt/ebook-truncated.epub")))).toBe("fileDamaged");
    expect(codeOf(() => readEpub(fixture("image.png")))).toBe("unsupportedFormat");
  });

  it("font obfuscation alone is not DRM; a package with no readable chapter is damaged", () => {
    const enc = (algorithm: string) =>
      `<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#"><enc:EncryptedData><enc:EncryptionMethod Algorithm="${algorithm}"/></enc:EncryptedData></encryption>`;
    const container = `<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>`;
    const opf = (spine: string) =>
      `<package xmlns="http://www.idpf.org/2007/opf"><metadata/><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/><item id="up" href="../../etc/passwd" media-type="application/xhtml+xml"/></manifest><spine>${spine}</spine></package>`;
    const book = (files: Record<string, string>) =>
      zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, new TextEncoder().encode(v)])));
    const ok = readEpub(
      book({
        "META-INF/container.xml": container,
        "META-INF/encryption.xml": enc("http://www.idpf.org/2008/embedding"),
        "book.opf": opf('<itemref idref="a"/>'),
        "a.xhtml": "<html><body><p>Hola</p></body></html>",
      }),
    );
    expect(ok.title).toBe("");
    expect(ok.chapters).toHaveLength(1);
    const files = { "META-INF/container.xml": container, "book.opf": opf('<itemref idref="up"/>'), "a.xhtml": "<p>x</p>" };
    expect(codeOf(() => readEpub(book(files)))).toBe("fileDamaged");
    expect(codeOf(() => readEpub(book({ ...files, "META-INF/encryption.xml": enc("http://www.w3.org/2001/04/xmlenc#aes256-cbc") })))).toBe("ebookDrm");
    expect(codeOf(() => readEpub(book({ ...files, "META-INF/rights.xml": "<rights/>" })))).toBe("ebookDrm");
  });
});

describe("resolveHref", () => {
  it("resolves relative, encoded and fragment hrefs and never leaves the book", () => {
    expect(resolveHref("OEBPS/content.opf", "Text/chapter%201.xhtml#x")).toBe("OEBPS/Text/chapter 1.xhtml");
    expect(resolveHref("OEBPS/Text/a.xhtml", "../Images/b.png")).toBe("OEBPS/Images/b.png");
    expect(resolveHref("OEBPS/Text/a.xhtml", "./b.xhtml?x=1")).toBe("OEBPS/Text/b.xhtml");
    expect(resolveHref("OEBPS/a.xhtml", "../../etc/passwd")).toBeNull();
    expect(resolveHref("OEBPS/a.xhtml", "https://example.com/a.png")).toBeNull();
    expect(resolveHref("OEBPS/a.xhtml", "data:image/png;base64,AAAA")).toBeNull();
    expect(resolveHref("OEBPS/a.xhtml", "#only")).toBeNull();
  });
});
